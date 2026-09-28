import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(_cookies: { name: string; value: string; options: any }[]) {},
      },
    }
  );
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const resolved = await params;
  const supabase = await getSupabase();

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
