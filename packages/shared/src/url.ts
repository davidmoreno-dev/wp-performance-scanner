export function normalizeUrl(url: string): string {
  let normalized = url.trim();

  if (!normalized.match(/^https?:\/\//i)) {
    normalized = `https://${normalized}`;
  }

  try {
    const urlObj = new URL(normalized);

    urlObj.protocol = urlObj.protocol.toLowerCase();
    urlObj.hostname = urlObj.hostname.toLowerCase();

    if (urlObj.port === "80" && urlObj.protocol === "http:") {
      urlObj.port = "";
    }
    if (urlObj.port === "443" && urlObj.protocol === "https:") {
      urlObj.port = "";
    }

    urlObj.pathname = urlObj.pathname.replace(/\/$/, "") || "/";

    urlObj.hash = "";

    return urlObj.toString();
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(normalizeUrl(url));
    return true;
  } catch {
    return false;
  }
}
