"use client";

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "Starting...", color: "text-[#7b80a0]" },
  fetching: { label: "Fetching commit history...", color: "text-[#4f6ef6]" },
  analyzing: { label: "Analyzing evidence...", color: "text-[#4f6ef6]" },
  publishing: { label: "Publishing...", color: "text-[#4f6ef6]" },
  success: { label: "Complete!", color: "text-green-400" },
  failed: { label: "Failed", color: "text-red-400" },
};

export default function RunProgress({ run }: { run: any }) {
  const current = statusLabels[run.status] || statusLabels.pending;

  const steps = [
    { key: "fetching", label: "Fetch commits" },
    { key: "analyzing", label: "Analyze" },
    { key: "publishing", label: "Publish" },
  ];

  const stepOrder = steps.map((s) => s.key);
  const currentStepIndex = stepOrder.indexOf(run.status);

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="relative">
        <div className="h-2 rounded-full bg-[#1a1f3a] overflow-hidden">
          <div
            className="h-full rounded-full bg-[#4f6ef6] transition-all duration-1000"
            style={{
              width:
                run.status === "failed"
                  ? "100%"
                  : run.status === "success"
                  ? "100%"
                  : `${Math.min(((currentStepIndex + 1) / steps.length) * 100, 90)}%`,
            }}
          />
        </div>
      </div>

      {/* Step labels */}
      <div className="flex items-center justify-between">
        {steps.map((step, i) => {
          const isActive = i <= currentStepIndex && run.status !== "failed";
          const isCurrent = i === currentStepIndex && run.status !== "success" && run.status !== "failed";
          const isFailed = run.status === "failed" && i === currentStepIndex;

          return (
            <div key={step.key} className="flex-1 text-center">
              <div
                className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium mb-2 ${
                  isFailed
                    ? "bg-red-950 text-red-400 border border-red-900"
                    : isActive
                    ? "bg-[#4f6ef6] text-white"
                    : "bg-[#1a1f3a] text-[#7b80a0]"
                } ${isCurrent ? "ring-2 ring-[#4f6ef6] ring-offset-2 ring-offset-[#070b1a]" : ""}`}
              >
                {isActive && !isFailed ? "✓" : i + 1}
              </div>
              <p
                className={`text-xs ${
                  isFailed
                    ? "text-red-400"
                    : isActive
                    ? "text-[#e8eaf0]"
                    : "text-[#7b80a0]"
                }`}
              >
                {step.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Status message */}
      <p className={`text-center text-sm font-medium ${current.color}`}>
        {current.label}
      </p>

      {/* Timestamps */}
      <div className="text-xs text-[#7b80a0] text-center space-y-1">
        <p>Started: {new Date(run.started_at).toLocaleString()}</p>
        {run.finished_at && (
          <p>Finished: {new Date(run.finished_at).toLocaleString()}</p>
        )}
      </div>
    </div>
  );
}
