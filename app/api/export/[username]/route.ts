import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// CORS headers so self-hosted pages can fetch projects.json cross-origin
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const resolved = await params;
  const username = resolved.username;

  // Get latest successful run for this user
  const { data: runs } = await supabase
    .from("runs")
    .select("id")
    .eq("username", username)
    .eq("status", "success")
    .order("started_at", { ascending: false })
    .limit(1);

  if (!runs?.length) {
    return NextResponse.json([], { headers: corsHeaders });
  }

  // Fetch project entries from that run
  const { data: entries } = await supabase
    .from("project_entries")
    .select("entry")
    .eq("run_id", runs[0].id)
    .order("created_at", { ascending: true });

  const projects = (entries || []).map((e) => e.entry);

  return NextResponse.json(projects, { headers: corsHeaders });
}
