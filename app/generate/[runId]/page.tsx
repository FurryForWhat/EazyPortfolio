"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import RunProgress from "@/components/run-progress";
import PortfolioCard from "@/components/portfolio-card";

const supabase = createClient();

function GenerateInner({ runId }: { runId: string }) {
  const router = useRouter();
  // Repo list for this run comes from the dashboard as ?repos=a,b,c — the
  // runs table doesn't store selections, and this survives a page refresh.
  const searchParams = useSearchParams();
  const allRepos = (searchParams.get("repos") || "")
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean);

  const [run, setRun] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Record<string, unknown>[]>([]);
  const [completedRepos, setCompletedRepos] = useState<string[]>([]);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const poll = useCallback(async () => {
    const [{ data: runRow }, { data: entries }] = await Promise.all([
      supabase.from("runs").select("*").eq("id", runId).single(),
      supabase
        .from("project_entries")
        .select("repo_name, entry")
        .eq("run_id", runId)
        .order("created_at", { ascending: true }),
    ]);

    if (runRow) setRun(runRow);
    if (entries) {
      setCompletedRepos(entries.map((e) => e.repo_name));
      setProjects(entries.map((e) => e.entry));
    }

    if (runRow && runRow.status !== "success" && runRow.status !== "failed") {
      pollRef.current = setTimeout(poll, 1500);
    }
  }, [runId]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      if (cancelled) return;
      await poll();
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, [poll, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-[#4f6ef6] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!run) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[#7b80a0]">Run not found.</p>
      </div>
    );
  }

  const base = (process.env.NEXT_PUBLIC_BASE_URL || "").replace(/\/$/, "");
  const portfolioUrl = base
    ? `${base}/${run.username}`
    : `/${run.username}`;
  const portfolioLabel = base
    ? `${base.replace(/^https?:\/\//, "")}/${run.username}`
    : `your site/${run.username}`;

  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <h1 className="text-2xl font-bold mb-6">Generating Portfolio</h1>
      <RunProgress run={run} allRepos={allRepos} completedRepos={completedRepos} />

      {run.status === "success" && (
        <>
          <div className="mt-8 rounded-xl border border-green-900/50 bg-green-950/20 p-6">
            <h2 className="text-lg font-semibold text-green-400 mb-2">
              Portfolio ready!
            </h2>
            <p className="text-sm text-[#7b80a0] mb-4">
              View your portfolio at:{" "}
              <a
                href={portfolioUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#4f6ef6] underline break-all"
              >
                {portfolioLabel}
              </a>
            </p>
            <button
              onClick={() => router.push("/dashboard")}
              className="rounded-lg bg-[#4f6ef6] px-4 py-2 text-sm font-medium text-white hover:bg-[#3d5bd9]"
            >
              Back to Dashboard
            </button>
          </div>

          {/* Preview generated projects */}
          {projects.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold mb-4">Generated Projects</h2>
              <div className="space-y-8">
                {projects.map((project, i) => (
                  <PortfolioCard key={(project.id as string) + i} project={project} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {run.status === "failed" && (
        <div className="mt-8 rounded-xl border border-red-900/50 bg-red-950/20 p-6">
          <h2 className="text-lg font-semibold text-red-400 mb-2">
            Generation failed
          </h2>
          <p className="text-sm text-[#7b80a0] mb-4">{run.error}</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-lg border border-[#1a1f3a] px-4 py-2 text-sm font-medium text-[#e8eaf0] hover:bg-[#0c1024]"
          >
            Back to Dashboard
          </button>
        </div>
      )}
    </div>
  );
}

export default function GeneratePage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const [runId, setRunId] = useState<string>("");

  useEffect(() => {
    params.then((p) => setRunId(p.runId));
  }, [params]);

  if (!runId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-[#4f6ef6] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="animate-spin h-8 w-8 border-2 border-[#4f6ef6] border-t-transparent rounded-full" />
        </div>
      }
    >
      <GenerateInner runId={runId} />
    </Suspense>
  );
}
