import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const resolved = await params;
  const supabase = createRouteHandlerClient({ cookies });

  const { data: run } = await supabase
    .from("runs")
    .select("*")
    .eq("id", resolved.runId)
    .single();

  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  const { data: entries } = await supabase
    .from("project_entries")
    .select("entry")
    .eq("run_id", resolved.runId);

  return NextResponse.json({
    ...run,
    entries: entries?.map((e) => e.entry) || [],
  });
}
