import { z } from "zod";
import { normalizeUrl, isValidUrl } from "@wps/shared";

export const scanSchema = z.object({
  url: z
    .string({ required_error: "URL is required" })
    .min(1, "URL cannot be empty")
    .max(2048, "URL is too long")
    .transform((val) => val.trim())
    .refine(isValidUrl, {
      message: "Please enter a valid URL (e.g., https://example.com)"
    })
    .transform((val) => normalizeUrl(val))
});

export type ScanInput = z.infer<typeof scanSchema>;

export const URL_MAX_LENGTH = 2048;
