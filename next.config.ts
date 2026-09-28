import type { NextConfig } from "next";
import fs from "node:fs";
import path from "node:path";

// Missing env vars used to surface as a cryptic `supabaseUrl is required`
// stack trace from a module-level client halfway through `next build` — on a
// fresh Vercel import that just shows "No Deployment". Check them up front so
// the build log names exactly what to set.
const BUILD_CRITICAL = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

// These don't break the build, but the app is broken without them at runtime.
const RUNTIME_CRITICAL = [
  "GITHUB_TOKEN",
  "ANTHROPIC_BASE_URL",
  "ANTHROPIC_API_KEY",
  "ANALYZER_MODEL",
  "NEXT_PUBLIC_BASE_URL",
] as const;

function checkEnv(): void {
  const missingRuntime = RUNTIME_CRITICAL.filter((name) => !process.env[name]);
  if (missingRuntime.length > 0) {
    console.warn(
      [
        "",
        "WARNING: missing runtime environment variables (build continues, but these features fail at runtime):",
        ...missingRuntime.map((name) => `  - ${name}`),
        "Add them in Vercel -> Settings -> Environment Variables, or copy .env.example to .env.local.",
        "",
      ].join("\n")
    );
  }

  const missingBuild = BUILD_CRITICAL.filter((name) => !process.env[name]);
  if (missingBuild.length > 0) {
    const hasLocalEnv = fs.existsSync(path.join(process.cwd(), ".env.local"));
    throw new Error(
      [
        "Missing build-critical environment variables:",
        ...missingBuild.map((name) => `  - ${name}`),
        "",
        hasLocalEnv
          ? "A .env.local exists but was not loaded before next.config — check that the file is not empty for these keys."
          : "Set them in Vercel -> Settings -> Environment Variables (Production), or create .env.local from .env.example for local builds.",
      ].join("\n")
    );
  }
}

const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname,
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
        ],
      },
    ];
  },
};

export default function configure(phase: string): NextConfig {
  if (phase === "phase-production-build") checkEnv();
  return nextConfig;
}
