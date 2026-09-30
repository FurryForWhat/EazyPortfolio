"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { fetchPortfolioProjects } from "@/lib/portfolio";
import PortfolioCard from "./portfolio-card";

const supabase = createClient();

interface Profile {
  id: string;
  github_login: string;
}

interface DashboardProps {
  profile: Profile;
  initialProjects?: Record<string, unknown>[];
}

export default function Dashboard({ profile, initialProjects = [] }: DashboardProps) {
  const router = useRouter();
  const [repos, setRepos] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<Record<string, unknown>[]>(initialProjects);

  useEffect(() => {
    fetchRepos();
  }, []);

  async function fetchRepos() {
    try {
      const res = await fetch("/api/repos");
      if (!res.ok) throw new Error("Failed to fetch repos");
      const data = await res.json();
      setRepos(data.repos);
      // Pre-select previously selected repos
      const preSelected = new Set<string>(
        data.repos.filter((r: any) => r.alreadySelected).map((r: any) => r.name)
      );
      setSelected(preSelected);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function toggleRepo(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  async function handleSync() {
    if (selected.size === 0) return;
    setSyncing(true);
    setError(null);

    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoSelections: Array.from(selected) }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || data.error || "Sync failed");
      }

      // sync returns as soon as the run row exists — generation continues
      // in the background, so the progress page starts polling right away.
      const repos = Array.from(selected).map(encodeURIComponent).join(",");
      router.push(`/generate/${data.runId}?repos=${repos}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  async function refreshProjects() {
    try {
      setProjects(await fetchPortfolioProjects(supabase, profile.id));
    } catch {
      // Silently fail — dashboard still works
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="mb-10 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">
            Welcome, @{profile.github_login}
          </h1>
          <p className="text-[#7b80a0]">
            Select repos to include in your portfolio, then generate.
          </p>
        </div>
        <button
          onClick={async () => {
            await fetch("/api/logout", { method: "POST" });
            router.push("/");
          }}
          className="self-start rounded-lg border border-[#1a1f3a] px-4 py-2 text-sm font-medium text-[#7b80a0] hover:text-[#e8eaf0] hover:border-[#2a2f4a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4f6ef6] transition-colors"
        >
          Sign out
        </button>
      </div>

      {/* Repo picker */}
      <div className="rounded-xl border border-[#1a1f3a] bg-[#0c1024] mb-8">
        <div className="px-6 py-4 border-b border-[#1a1f3a] flex items-center justify-between">
          <h2 className="font-semibold">Your Repositories</h2>
          <span className="text-sm text-[#7b80a0]">
            {selected.size} selected
          </span>
        </div>

        {error && (
          <div className="mx-6 mt-4 rounded-lg border border-red-900/50 bg-red-950/20 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="divide-y divide-[#1a1f3a] max-h-96 overflow-y-auto">
          {loading && (
            <div className="px-6 py-10 text-center text-sm text-[#7b80a0]">
              Loading your repositories…
            </div>
          )}

          {!loading && repos.length === 0 && (
            <div className="px-6 py-10 text-center">
              <p className="text-sm text-[#7b80a0] mb-3">
                No repositories found. They may be private, or GitHub may be
                rate-limiting this session.
              </p>
              <button
                onClick={fetchRepos}
                className="text-sm text-[#4f6ef6] hover:underline"
              >
                Try again
              </button>
            </div>
          )}

          {repos.map((repo) => (
            <label
              key={repo.name}
              className="flex items-center gap-4 px-6 py-4 cursor-pointer hover:bg-[#070b1a]/50 transition-colors"
            >
              <input
                type="checkbox"
                checked={selected.has(repo.name)}
                onChange={() => toggleRepo(repo.name)}
                className="h-5 w-5 rounded border-[#1a1f3a] bg-[#070b1a] text-[#4f6ef6] focus:ring-[#4f6ef6] focus:ring-offset-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{repo.name}</span>
                  {repo.language && (
                    <span className="text-xs text-[#7b80a0]">{repo.language}</span>
                  )}
                </div>
                {repo.description && (
                  <p className="text-sm text-[#7b80a0] truncate">
                    {repo.description}
                  </p>
                )}
              </div>
              <a
                href={repo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[#4f6ef6] hover:underline shrink-0"
              >
                View →
              </a>
            </label>
          ))}
        </div>
      </div>

      {/* Generate button */}
      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-14">
        <button
          onClick={fetchRepos}
          disabled={loading}
          className="text-sm text-[#7b80a0] hover:text-[#e8eaf0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Refresh list
        </button>
        <button
          onClick={handleSync}
          disabled={selected.size === 0 || syncing}
          className="rounded-lg bg-[#4f6ef6] px-6 py-3 text-base font-medium text-white hover:bg-[#3d5bd9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4f6ef6] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {syncing ? "Generating..." : `Generate Portfolio (${selected.size})`}
        </button>
      </div>

      {/* Generated portfolios */}
      <div className="border-t border-[#1a1f3a] pt-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Your Portfolios</h2>
          <button
            onClick={refreshProjects}
            className="text-sm text-[#7b80a0] hover:text-[#e8eaf0] transition-colors"
          >
            Refresh
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#1a1f3a] p-8 text-center">
            <p className="text-[#7b80a0] mb-1">No projects yet.</p>
            <p className="text-sm text-[#7b80a0]">
              Select repos above and click Generate to build your portfolio.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {projects.map((project, i) => (
              <PortfolioCard key={(project.id as string) + i} project={project} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
