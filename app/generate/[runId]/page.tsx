"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import RunProgress from "@/components/run-progress";
import PortfolioCard from "@/components/portfolio-card";

const supabase = createClient();

interface Profile {
  id: string;
  github_login: string;
}

export default function GeneratePage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const router = useRouter();
  const [runId, setRunId] = useState<string>("");
  const [run, setRun] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    (async () => {
      const resolved = await params;
      setRunId(resolved.runId);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      // Poll for status updates
      const interval = setInterval(async () => {
        const { data } = await supabase
          .from("runs")
          .select("*")
          .eq("id", resolved.runId)
          .single();

        if (data) {
          setRun(data);

          // Also fetch projects if run is complete
          if (data.status === "success" || data.status === "failed") {
            clearInterval(interval);
            // Fetch project entries
            const { data: entries } = await supabase
              .from("project_entries")
              .select("entry")
              .eq("run_id", resolved.runId)
              .order("created_at", { ascending: true });
            if (entries) {
              setProjects(entries.map((e) => e.entry));
            }
          }
        }
      }, 2000);

      // Initial fetch
      const { data: initialRun } = await supabase
        .from("runs")
        .select("*")
        .eq("id", resolved.runId)
        .single();

      if (initialRun) {
        setRun(initialRun);
        if (initialRun.status === "success" || initialRun.status === "failed") {
          clearInterval(interval);
          const { data: entries } = await supabase
            .from("project_entries")
            .select("entry")
            .eq("run_id", resolved.runId)
            .order("created_at", { ascending: true });
          if (entries) {
            setProjects(entries.map((e) => e.entry));
          }
        }
      }

      setLoading(false);
      return () => clearInterval(interval);
    })();
  }, [params, router]);

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

  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <h1 className="text-2xl font-bold mb-6">Generating Portfolio</h1>
      <RunProgress run={run} />

      {run.status === "success" && (
        <>
          <div className="mt-8 rounded-xl border border-green-900/50 bg-green-950/20 p-6">
            <h2 className="text-lg font-semibold text-green-400 mb-2">
              Portfolio ready!
            </h2>
            <p className="text-sm text-[#7b80a0] mb-4">
              View your portfolio at:{" "}
              <a
                href={`/${run.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#4f6ef6] underline"
              >
                eazyportfolio.dev/{run.username}
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
