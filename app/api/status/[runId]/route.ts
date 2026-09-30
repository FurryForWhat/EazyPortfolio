import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

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

const TERMINAL_STATUSES = new Set(["success", "failed"]);

// A run whose background task was killed (function timeout, deploy mid-run,
// crash before the catch) never writes finished_at, so the progress page
// polled a spinner forever (issue #2). Reap it on read: a non-terminal run
// older than this is flipped to failed with a message that says so. Override
// with RUN_STALE_MINUTES for repos that legitimately take longer.
const STALE_MINUTES = Number(process.env.RUN_STALE_MINUTES) || 30;

interface RunRow {
  id: string;
  status: string | null;
  error: string | null;
  started_at: string | null;
  finished_at: string | null;
  [key: string]: unknown;
}

async function reapIfStale(
  supabase: SupabaseClient,
  run: RunRow
): Promise<RunRow> {
  if (!run.status || TERMINAL_STATUSES.has(run.status) || run.finished_at) {
    return run;
  }

  const startedAt = Date.parse(run.started_at ?? "");
  if (Number.isNaN(startedAt)) return run;
  if ((Date.now() - startedAt) / 60_000 < STALE_MINUTES) return run;

  const error =
    run.error ??
    `Run stopped without finishing (no update for ${STALE_MINUTES} minutes). ` +
      "The background task was likely interrupted — start a new generation.";

  // RLS allows "Users can update own runs": the row was only readable because
  // this visitor owns it, so the same session client can write the final state.
  await supabase
    .from("runs")
    .update({
      status: "failed",
      error,
      finished_at: new Date().toISOString(),
    })
    .eq("id", run.id)
    .is("finished_at", null);

  return { ...run, status: "failed", error };
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
    .select("repo_name, entry")
    .eq("run_id", resolved.runId)
    .order("created_at", { ascending: true });

  return NextResponse.json({
    ...(await reapIfStale(supabase, run as RunRow)),
    entries: entries ?? [],
  });
}
