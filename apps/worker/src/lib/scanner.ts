import { chromium, type Browser, type Page } from "playwright";

interface ScannerOptions {
  url: string;
  timeout?: number;
  navigationTimeout?: number;
}

interface HeavyResource {
  url: string;
  size_bytes: number;
  type: string;
}

interface Recommendation {
  type: "error" | "warning" | "info";
  category: string;
  title: string;
  description: string;
  url?: string;
}

interface ScanReport {
  url: string;
  finalUrl: string;
  pageTitle: string;
  loadTimeMs: number;
  domContentLoadedMs: number;
  requestCount: number;
  totalBytes: number;
  imageCount: number;
  heavyImagesCount: number;
  heavyImages: HeavyResource[];
  scriptCount: number;
  heavyScriptsCount: number;
  heavyScripts: HeavyResource[];
  stylesheetCount: number;
  heavyStylesheetsCount: number;
  heavyStylesheets: HeavyResource[];
  lazyLoadingImplemented: boolean;
  lazyImagesCount: number;
  nonLazyImagesCount: number;
  wpDetected: boolean;
  wpVersion: string | null;
  wpPlugins: string[];
  recommendations: Recommendation[];
}

const HEAVY_IMAGE_THRESHOLD_KB = 200;
const HEAVY_SCRIPT_THRESHOLD_KB = 100;
const HEAVY_STYLESHEET_THRESHOLD_KB = 50;

const WP_GENERATOR_PATTERNS = [
  /WordPress\s*v?([\d.]+)/i,
  /wordpress\s+v?([\d.]+)/i,
];

const WP_PLUGIN_PATTERNS = [
  /\/wp-content\/plugins\/([^\/]+)/gi,
];

const WP_THEME_PATTERNS = [
  /\/wp-content\/themes\/([^\/]+)/gi,
];

async function detectWordPress(
  page: Page,
  html: string
): Promise<{ detected: boolean; version: string | null; plugins: string[] }> {
  let detected = false;
  let version: string | null = null;
  const plugins: string[] = [];

  const generatorMatch = html.match(/<meta name="generator"[^>]*content="([^"]*)"/i);
  if (generatorMatch) {
    const content = generatorMatch[1];
    for (const pattern of WP_GENERATOR_PATTERNS) {
      const match = content.match(pattern);
      if (match) {
        detected = true;
        version = match[1] || null;
        break;
      }
    }
    if (!detected && /wordpress/i.test(content)) {
      detected = true;
    }
  }

  const htmlLower = html.toLowerCase();
  if (
    htmlLower.includes("/wp-content/") ||
    htmlLower.includes("/wp-includes/") ||
    htmlLower.includes('id="wp-toolbar"') ||
    htmlLower.includes("wp-block-library") ||
    htmlLower.includes("wp-emoji")
  ) {
    detected = true;
  }

  if (htmlLower.includes("/wp-content/plugins/")) {
    const pluginMatches = html.matchAll(WP_PLUGIN_PATTERNS[0]);
    for (const match of pluginMatches) {
      if (match[1] && !plugins.includes(match[1])) {
        plugins.push(match[1]);
      }
    }
  }

  return { detected, version, plugins: plugins.slice(0, 20) };
}

async function analyzeResources(
  page: Page
): Promise<{
  requestCount: number;
  totalBytes: number;
  images: { url: string; size_bytes: number }[];
  scripts: { url: string; size_bytes: number }[];
  stylesheets: { url: string; size_bytes: number }[];
  lazyImages: number;
  nonLazyImages: number;
}> {
  const resources = await page.evaluate(() => {
    const data: {
      requestCount: number;
      totalBytes: number;
      images: { url: string; size_bytes: number }[];
      scripts: { url: string; size_bytes: number }[];
      stylesheets: { url: string; size_bytes: number }[];
      lazyImages: number;
      nonLazyImages: number;
    } = {
      requestCount: 0,
      totalBytes: 0,
      images: [],
      scripts: [],
      stylesheets: [],
      lazyImages: 0,
      nonLazyImages: 0,
    };

    const performance = window.performance;
    const entries = performance.getEntriesByType("resource") as PerformanceResourceTiming[];

    for (const entry of entries) {
      const size = entry.transferSize || entry.encodedBodySize || 0;
      if (size > 0) {
        data.totalBytes += size;
      }
      data.requestCount++;

      const url = entry.name;
      const type = entry.initiatorType;

      if (type === "img" || url.match(/\.(jpg|jpeg|png|gif|webp|svg|ico|avif)(\?|$)/i)) {
        data.images.push({ url, size_bytes: size });
      } else if (type === "script" || url.match(/\.js(\?|$)/i)) {
        data.scripts.push({ url, size_bytes: size });
      } else if (type === "link" || url.match(/\.css(\?|$)/i)) {
        data.stylesheets.push({ url, size_bytes: size });
      }
    }

    const imgElements = Array.from(document.querySelectorAll("img"));
    for (const img of imgElements) {
      const loading = img.getAttribute("loading");
      const srcset = img.getAttribute("srcset");
      if (loading === "lazy" || srcset?.includes("lazy")) {
        data.lazyImages++;
      } else {
        data.nonLazyImages++;
      }
    }

    return data;
  });

  return resources;
}

function generateRecommendations(
  report: Omit<ScanReport, "recommendations">,
  html: string
): Recommendation[] {
  const recs: Recommendation[] = [];

  if (!report.wpDetected) {
    recs.push({
      type: "info",
      category: "platform",
      title: "No WordPress detected",
      description:
        "This site does not appear to be a WordPress site. This scanner is optimized for WordPress analysis.",
    });
  } else {
    recs.push({
      type: "info",
      category: "platform",
      title: "WordPress detected",
      description: `WordPress ${report.wpVersion || "unknown version"} detected.${
        report.wpPlugins.length > 0
          ? ` Found ${report.wpPlugins.length} plugins.`
          : ""
      }`,
    });
  }

  if (report.loadTimeMs > 5000) {
    recs.push({
      type: "error",
      category: "performance",
      title: "Slow page load time",
      description: `Page took ${(report.loadTimeMs / 1000).toFixed(1)}s to load. Target is under 3s.`,
    });
  } else if (report.loadTimeMs > 3000) {
    recs.push({
      type: "warning",
      category: "performance",
      title: "Moderate page load time",
      description: `Page took ${(report.loadTimeMs / 1000).toFixed(1)}s to load. Consider optimizing.`,
    });
  } else if (report.loadTimeMs > 0) {
    recs.push({
      type: "info",
      category: "performance",
      title: "Good page load time",
      description: `Page loaded in ${(report.loadTimeMs / 1000).toFixed(1)}s.`,
    });
  }

  for (const img of report.heavyImages.slice(0, 5)) {
    recs.push({
      type: "warning",
      category: "images",
      title: "Heavy image detected",
      description: `Image is ${(img.size_bytes / 1024).toFixed(0)} KB. Consider compressing or using WebP.`,
      url: img.url,
    });
  }

  if (report.heavyImagesCount === 0 && report.imageCount > 0) {
    recs.push({
      type: "info",
      category: "images",
      title: "No oversized images",
      description: "All images appear to be within acceptable size limits.",
    });
  }

  for (const script of report.heavyScripts.slice(0, 3)) {
    recs.push({
      type: "warning",
      category: "scripts",
      title: "Heavy script detected",
      description: `Script is ${(script.size_bytes / 1024).toFixed(0)} KB. Consider code splitting or lazy loading.`,
      url: script.url,
    });
  }

  if (report.stylesheetCount > 10) {
    recs.push({
      type: "warning",
      category: "stylesheets",
      title: "Too many stylesheets",
      description: `${report.stylesheetCount} stylesheets detected. Consider consolidating.`,
    });
  }

  for (const css of report.heavyStylesheets.slice(0, 3)) {
    recs.push({
      type: "warning",
      category: "stylesheets",
      title: "Heavy stylesheet detected",
      description: `Stylesheet is ${(css.size_bytes / 1024).toFixed(0)} KB. Consider minifying.`,
      url: css.url,
    });
  }

  if (!report.lazyLoadingImplemented && report.nonLazyImagesCount > 5) {
    recs.push({
      type: "warning",
      category: "images",
      title: "Lazy loading not implemented",
      description: `${report.nonLazyImagesCount} images without lazy loading. Consider adding loading="lazy".`,
    });
  }

  if (report.totalBytes > 5 * 1024 * 1024) {
    recs.push({
      type: "error",
      category: "performance",
      title: "Excessive total page weight",
      description: `Page transferred ${(report.totalBytes / (1024 * 1024)).toFixed(1)} MB. Target is under 2 MB.`,
    });
  }

  return recs;
}

function calculateScore(report: ScanReport): number {
  let score = 100;

  if (report.loadTimeMs > 5000) score -= 20;
  else if (report.loadTimeMs > 3000) score -= 10;
  else if (report.loadTimeMs > 0) score -= 0;

  score -= Math.min(20, report.heavyImagesCount * 3);
  score -= Math.min(15, report.heavyScriptsCount * 5);
  score -= Math.min(10, report.heavyStylesheetsCount * 3);

  if (!report.lazyLoadingImplemented && report.nonLazyImagesCount > 5) {
    score -= 10;
  }

  if (report.totalBytes > 5 * 1024 * 1024) score -= 10;
  else if (report.totalBytes > 2 * 1024 * 1024) score -= 5;

  return Math.max(0, Math.min(100, score));
}

export async function scanPage(options: ScannerOptions): Promise<ScanReport> {
  const timeout = options.timeout ?? 30000;
  const navTimeout = options.navigationTimeout ?? 20000;

  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
      ],
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 WP-Performance-Scanner/1.0",
      ignoreHTTPSErrors: true,
    });

    const page = await context.newPage();

    const navigationPromise = page.goto(options.url, {
      waitUntil: "networkidle",
      timeout: navTimeout,
    });

    const timedNav = navigationPromise.then((response) => {
      if (!response) return null;
      return { status: response.status(), url: response.url() };
    });

    const navResult = await Promise.race([
      timedNav,
      new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), navTimeout)
      ),
    ]);

    const startTime = Date.now();
    await page.waitForLoadState("domcontentloaded", { timeout: 5000 }).catch(() => {});
    const domContentLoadedMs = Date.now() - startTime;

    await page.waitForTimeout(1000);

    const performanceMetrics = await page.evaluate(() => {
      const timing = performance.timing;
      const loadTime = timing.loadEventEnd - timing.navigationStart;
      const domContentLoaded = timing.domContentLoadedEventEnd - timing.navigationStart;

      return {
        loadTimeMs: Math.max(0, loadTime),
        domContentLoadedMs: Math.max(0, domContentLoaded),
      };
    });

    const html = await page.content();

    const wpInfo = await detectWordPress(page, html);

    const resourceData = await analyzeResources(page);

    const pageTitle = await page.title().catch(() => "");
    const finalUrl = page.url();

    await browser.close();
    browser = null;

    const heavyImages: HeavyResource[] = resourceData.images
      .filter((img) => img.size_bytes > HEAVY_IMAGE_THRESHOLD_KB * 1024)
      .map((img) => ({ url: img.url, size_bytes: img.size_bytes, type: "image" }))
      .slice(0, 10);

    const heavyScripts: HeavyResource[] = resourceData.scripts
      .filter((s) => s.size_bytes > HEAVY_SCRIPT_THRESHOLD_KB * 1024)
      .map((s) => ({ url: s.url, size_bytes: s.size_bytes, type: "script" }))
      .slice(0, 10);

    const heavyStylesheets: HeavyResource[] = resourceData.stylesheets
      .filter((c) => c.size_bytes > HEAVY_STYLESHEET_THRESHOLD_KB * 1024)
      .map((c) => ({ url: c.url, size_bytes: c.size_bytes, type: "stylesheet" }))
      .slice(0, 10);

    const reportBase = {
      url: options.url,
      finalUrl,
      pageTitle,
      loadTimeMs: performanceMetrics.loadTimeMs || domContentLoadedMs,
      domContentLoadedMs: performanceMetrics.domContentLoadedMs || domContentLoadedMs,
      requestCount: resourceData.requestCount,
      totalBytes: resourceData.totalBytes,
      imageCount: resourceData.images.length,
      heavyImagesCount: heavyImages.length,
      heavyImages,
      scriptCount: resourceData.scripts.length,
      heavyScriptsCount: heavyScripts.length,
      heavyScripts,
      stylesheetCount: resourceData.stylesheets.length,
      heavyStylesheetsCount: heavyStylesheets.length,
      heavyStylesheets,
      lazyLoadingImplemented: resourceData.lazyImages > 0,
      lazyImagesCount: resourceData.lazyImages,
      nonLazyImagesCount: resourceData.nonLazyImages,
      wpDetected: wpInfo.detected,
      wpVersion: wpInfo.version,
      wpPlugins: wpInfo.plugins,
    };

    const recommendations = generateRecommendations(reportBase, html);

    const score = calculateScore({ ...reportBase, recommendations });

    return {
      ...reportBase,
      recommendations,
    };
  } catch (error) {
    if (browser) {
      await browser.close().catch(() => {});
    }

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    throw new Error(`Scan failed: ${errorMessage}`);
  }
}
