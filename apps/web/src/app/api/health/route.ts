import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/supabase";
import { validateEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    validateEnv();

    const supabase = getServerClient();

    const { data, error } = await supabase.from("scans").select("id").limit(1);

    if (error) {
      return NextResponse.json(
        {
          status: "error",
          message: "Database connection failed",
          error: error.message,
          code: error.code
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: "ok",
      message: "Supabase connection successful",
      database: "connected",
      tables: {
        scans: "accessible"
      }
    });
  } catch (err) {
    if (err instanceof Error && err.name === "EnvironmentError") {
      return NextResponse.json(
        {
          status: "error",
          message: "Environment configuration error",
          error: err.message
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        status: "error",
        message: "Unexpected error",
        error: err instanceof Error ? err.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
