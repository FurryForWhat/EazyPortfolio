"use client";

const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
  in_progress: { bg: "bg-blue-950/50", text: "text-blue-400", label: "In Progress" },
  completed: { bg: "bg-green-950/50", text: "text-green-400", label: "Completed" },
  archived: { bg: "bg-[#1a1f3a]", text: "text-[#7b80a0]", label: "Archived" },
};

const evidenceStyles: Record<string, { bg: string; text: string }> = {
  commit_history: { bg: "", text: "" },
  readme_only: { bg: "bg-yellow-950/30", text: "text-yellow-600" },
};

interface ProjectData {
  title?: string;
  status?: string;
  evidence_level?: string;
  repo_url?: string;
  summary?: string;
  tech_stack?: string[];
  problem_solved?: string;
  how_i_solved_it?: string;
  last_updated?: string;
  demo_url?: string;
}

export default function PortfolioCard({ project }: { project: ProjectData }) {
  const status = statusStyles[project.status || "completed"] || statusStyles.completed;
  const evidence = evidenceStyles[project.evidence_level || "commit_history"] || evidenceStyles.commit_history;

  return (
    <div className="rounded-xl border border-[#1a1f3a] bg-[#0c1024] overflow-hidden hover:border-[#2a2f4a] transition-colors">
      {/* Card header */}
      <div className="px-6 py-5 border-b border-[#1a1f3a]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="text-lg font-semibold truncate">
                {project.title}
              </h3>
              <span
                className={`shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.text}`}
              >
                {status.label}
              </span>
              {(project.evidence_level as string) === "readme_only" && (
                <span
                  className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs ${evidence.bg} ${evidence.text}`}
                >
                  README only
                </span>
              )}
            </div>
            <a
              href={project.repo_url as string}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[#4f6ef6] hover:underline mt-1 inline-block"
            >
              {project.repo_url as string}
            </a>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="px-6 py-4">
        <p className="text-sm text-[#e8eaf0] leading-relaxed">
          {String(project.summary)}
        </p>
      </div>

      {/* Tech stack pills */}
      {Array.isArray(project.tech_stack) && (
        <div className="px-6 pb-4 flex flex-wrap gap-2">
          {(project.tech_stack as string[]).map((tech) => (
            <span
              key={tech}
              className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-[#070b1a] border border-[#1a1f3a] text-[#7b80a0]"
            >
              {tech}
            </span>
          ))}
        </div>
      )}

      {/* Challenge / Resolution split panel */}
      {project.problem_solved && project.how_i_solved_it && (
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#1a1f3a]">
          <div className="px-6 py-4">
            <span className="text-xs font-semibold text-[#4f6ef6] uppercase tracking-wider">
              Challenge
            </span>
            <p className="text-sm text-[#e8eaf0] mt-2 leading-relaxed">
              {project.problem_solved as string}
            </p>
          </div>
          <div className="px-6 py-4">
            <span className="text-xs font-semibold text-green-400 uppercase tracking-wider">
              Resolution
            </span>
            <p className="text-sm text-[#e8eaf0] mt-2 leading-relaxed">
              {project.how_i_solved_it as string}
            </p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-6 py-4 border-t border-[#1a1f3a] flex items-center justify-between">
        <span className="text-xs text-[#7b80a0]">
          Updated{" "}
          {project.last_updated
            ? new Date(project.last_updated as string).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })
            : "recently"}
        </span>
        {project.demo_url && (
          <a
            href={project.demo_url as string}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[#4f6ef6] hover:underline"
          >
            View Demo →
          </a>
        )}
      </div>
    </div>
  );
}
