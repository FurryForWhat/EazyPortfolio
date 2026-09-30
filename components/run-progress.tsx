"use client";

import { formatDateTime } from "@/lib/date";

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "Queued...", color: "text-[#7b80a0]" },
  fetching: { label: "Fetching commit history...", color: "text-[#4f6ef6]" },
  analyzing: { label: "Analyzing evidence...", color: "text-[#4f6ef6]" },
  publishing: { label: "Publishing...", color: "text-[#4f6ef6]" },
  success: { label: "Complete!", color: "text-green-400" },
  failed: { label: "Failed", color: "text-red-400" },
};

interface RunProgressProps {
  run: { status: string; started_at?: string; finished_at?: string; error?: string | null };
  /** All repos submitted for this run (names like "owner/repo"). */
  allRepos: string[];
  /** Repo names that already produced a project entry. */
  completedRepos: string[];
}

export default function RunProgress({ run, allRepos, completedRepos }: RunProgressProps) {
  const current = statusLabels[run.status] || statusLabels.pending;
  const terminal = run.status === "success" || run.status === "failed";

  const total = allRepos.length;
  const completed = completedRepos.length;
  // A finished run is 100% no matter what (failures surface in the list).
  const percent = terminal
    ? 100
    : total === 0
      ? 0
      : Math.min(99, Math.floor((completed / total) * 100));

  const completedSet = new Set(completedRepos);
  const remaining = allRepos.filter((r) => !completedSet.has(r));

  const steps = [
    { key: "fetching", label: "Fetch commits" },
    { key: "analyzing", label: "Analyze" },
    { key: "publishing", label: "Publish" },
  ];

  const stepOrder = ["pending", ...steps.map((s) => s.key), "success"];
  const currentStepIndex = stepOrder.indexOf(run.status);

  return (
    <div className="space-y-6">
      {/* Percent + progress bar */}
      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-sm text-[#e8eaf0] font-medium">
            {completed} of {total} {total === 1 ? "repo" : "repos"} completed
          </span>
          <span
            className={`text-2xl font-bold tabular-nums ${
              run.status === "failed" ? "text-red-400" : "text-[#4f6ef6]"
            }`}
          >
            {percent}%
          </span>
        </div>
        <div className="h-3 rounded-full bg-[#1a1f3a] overflow-hidden">
          <div
            className={`h-full transition-all duration-700 ease-out ${
              run.status === "failed" ? "bg-red-500" : "bg-[#4f6ef6]"
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* Step labels */}
      <div className="flex items-center justify-between">
        {steps.map((step, i) => {
          const isCurrent = i === currentStepIndex && !terminal;
          const isDone = currentStepIndex > i || (terminal && run.status === "success");
          const isFailed = run.status === "failed" && i === currentStepIndex - 1;

          return (
            <div key={step.key} className="flex-1 text-center">
              <div
                className={`mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  isFailed
                    ? "bg-red-950 text-red-400 border border-red-900"
                    : isDone
                      ? "bg-[#4f6ef6] text-white"
                      : isCurrent
                        ? "bg-[#4f6ef6] text-white ring-2 ring-[#4f6ef6] ring-offset-2 ring-offset-[#070b1a]"
                        : "bg-[#1a1f3a] text-[#7b80a0]"
                }`}
              >
                {isDone ? "✓" : i + 1}
              </div>
              <p
                className={`text-xs ${
                  isDone || isCurrent ? "text-[#e8eaf0]" : "text-[#7b80a0]"
                }`}
              >
                {step.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Status message */}
      <p className={`text-center text-sm font-medium ${current.color}`}>{current.label}</p>

      {/* Completed / remaining repo lists */}
      {total > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-[#1a1f3a] bg-[#0c1024] p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-green-400">
              Completed ({completed})
            </p>
            {completed === 0 ? (
              <p className="text-sm text-[#7b80a0]">None yet</p>
            ) : (
              <ul className="space-y-1">
                {completedRepos.map((repo) => (
                  <li key={repo} className="flex items-center gap-2 text-sm text-[#e8eaf0]">
                    <span className="text-green-400">✓</span>
                    <span className="truncate">{repo}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-[#1a1f3a] bg-[#0c1024] p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#7b80a0]">
              {run.status === "failed" ? "Not completed" : "Remaining"} ({remaining.length})
            </p>
            {remaining.length === 0 ? (
              <p className="text-sm text-[#7b80a0]">All done</p>
            ) : (
              <ul className="space-y-1">
                {remaining.map((repo) => (
                  <li
                    key={repo}
                    className={`flex items-center gap-2 text-sm ${
                      run.status === "failed" ? "text-red-400" : "text-[#7b80a0]"
                    }`}
                  >
                    <span>{run.status === "failed" ? "✗" : "…"}</span>
                    <span className="truncate">{repo}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Timestamps */}
      <div className="space-y-1 text-center text-xs text-[#7b80a0]">
        {run.started_at && <p>Started: {formatDateTime(run.started_at)}</p>}
        {run.finished_at && <p>Finished: {formatDateTime(run.finished_at)}</p>}
      </div>
    </div>
  );
}
