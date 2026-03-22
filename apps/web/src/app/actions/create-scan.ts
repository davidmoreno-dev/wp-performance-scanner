"use server";

import { revalidatePath } from "next/cache";
import { scanSchema } from "@/lib/scan-schema";
import { getServerClient } from "@/lib/supabase";
import { addScanJob, RedisConnectionError, QueueConnectionError } from "@/lib/queue";
import { ScanJobData } from "@wps/shared";

export interface CreateScanResult {
  success: boolean;
  data?: {
    id: string;
    public_token: string;
    original_url: string;
    normalized_url: string;
    status: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export async function createScan(
  formData: FormData
): Promise<CreateScanResult> {
  const rawUrl = formData.get("url");

  if (typeof rawUrl !== "string" || rawUrl.trim() === "") {
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Please enter a URL"
      }
    };
  }

  const parsed = scanSchema.safeParse({ url: rawUrl });

  if (!parsed.success) {
    const firstError = parsed.error.errors[0];
    return {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: firstError?.message ?? "Invalid URL"
      }
    };
  }

  const normalizedUrl = parsed.data.url;

  try {
    const supabase = getServerClient();

    const { data, error } = await supabase
      .from("scans")
      .insert({
        original_url: rawUrl.trim(),
        normalized_url: normalizedUrl,
        status: "pending"
      })
      .select("id, public_token, original_url, normalized_url, status")
      .single();

    if (error) {
      console.error("Supabase error creating scan:", error);
      
      const isDev = process.env.NODE_ENV !== "production";
      
      return {
        success: false,
        error: {
          code: "DATABASE_ERROR",
          message: isDev 
            ? `Database error: ${error.message} (${error.code})`
            : "Failed to create scan. Please try again."
        }
      };
    }

    if (!data) {
      return {
        success: false,
        error: {
          code: "UNKNOWN_ERROR",
          message: "Unexpected error creating scan"
        }
      };
    }

    const jobData: ScanJobData = {
      scanId: data.id,
      url: data.normalized_url,
      publicToken: data.public_token
    };

    try {
      await addScanJob(jobData);

      const { error: updateError } = await supabase
        .from("scans")
        .update({ status: "queued", queued_at: new Date().toISOString() })
        .eq("id", data.id);

      if (updateError) {
        console.error("Failed to update scan status to queued:", updateError);
      } else {
        data.status = "queued";
      }
    } catch (queueError) {
      console.error("Failed to enqueue scan job:", queueError);

      let errorMessage = "Failed to queue scan. Please try again.";
      let errorCode = "QUEUE_ERROR";

      if (queueError instanceof RedisConnectionError) {
        errorMessage = queueError.message;
        errorCode = "REDIS_ERROR";
      } else if (queueError instanceof QueueConnectionError) {
        errorMessage = queueError.message;
        errorCode = "QUEUE_ERROR";
      } else if (queueError instanceof Error) {
        errorMessage = queueError.message;
      }

      return {
        success: false,
        error: {
          code: errorCode,
          message: errorMessage
        }
      };
    }

    revalidatePath("/");

    return {
      success: true,
      data: {
        id: data.id,
        public_token: data.public_token,
        original_url: data.original_url,
        normalized_url: data.normalized_url,
        status: data.status
      }
    };
  } catch (err) {
    console.error("Unexpected error creating scan:", err);
    return {
      success: false,
      error: {
        code: "SERVER_ERROR",
        message: "An unexpected error occurred"
      }
    };
  }
}
