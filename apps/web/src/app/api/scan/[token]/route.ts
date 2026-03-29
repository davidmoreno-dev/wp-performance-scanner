import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(
  _request: unknown,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: scan, error: scanError } = await supabase
    .from("scans")
    .select("*")
    .eq("public_token", token)
    .single();

  if (scanError) {
    if (scanError.code === "PGRST116") {
      return NextResponse.json({ error: "Scan not found", token, code: scanError.code }, { status: 404 });
    }
    return NextResponse.json({ error: scanError.message, details: scanError }, { status: 500 });
  }

  if (!scan) {
    return NextResponse.json({ error: "Scan not found", token }, { status: 404 });
  }

  let results = null;
  if (scan.status === "completed") {
    const { data: scanResults, error: resultsError } = await supabase
      .from("scan_results")
      .select("*")
      .eq("scan_id", scan.id)
      .single();

    if (!resultsError && scanResults) {
      results = scanResults;
    }
  }

  return NextResponse.json({ ...scan, scan_results: results });
}
