# CLAUDE.md — EazyPortfolio V2

## What this is

EazyPortfolio is a **self-serve GitHub → portfolio SaaS**. A user signs in with GitHub, picks which of their repos to show, hits generate, and gets a live portfolio page at `/{username}` (or a custom domain). Generation runs as a serverless pipeline: fetch repo evidence from the GitHub REST API, have an LLM turn it into a structured project entry, store it in Supabase.

No Claude Code dependency at runtime — the `/update-portfolio` command, the Claude subagents, and `projects.json` in git are all **V1**, now archived under `legacy/`. The skills and agents in `.claude/` are developer tooling for maintaining this repo, not part of the product.

**Live:** https://eazy-portfolio-eight.vercel.app

## Repo layout

| Path | Purpose |
|---|---|
| `app/` | Next.js 15 App Router — pages and route handlers |
| `app/[username]/` | Public portfolio page |
| `app/dashboard/` | Repo selection + generate UI |
| `app/generate/[runId]/` | Live progress page (polls status) |
| `app/api/` | Route handlers — `auth/`, `repos/`, `sync/`, `status/[runId]/`, `export/[username]/`, `logout/` |
| `components/` | `dashboard.tsx`, `portfolio-card.tsx`, `run-progress.tsx` |
| `lib/` | Supabase clients (`supabase.ts` edge, `supabase-route.ts`, `supabase-server.ts`, `supabase-edge.ts`), `portfolio.ts` |
| `pipeline/` | Framework-agnostic generation core — `fetcher.mjs`, `analyzer.mjs`, `publisher.mjs`, `validate.mjs`, `index.mjs` (orchestrator) |
| `supabase/migrations/` | PostgreSQL schema — `001_initial.sql`, `002_add_github_token.sql`, `003_add_profile_policies.sql` |
| `.claude/` | Developer skills + agents (see table below). **Not gitignored** |
| `legacy/` | Archived V1 — Claude Code pipeline, static `EazyPortfolio-web/`, original skills/agents. Read-only reference |
| `slides/` | Marp decks — `pitch.md` (V1), `tech-stack.md` (V2) |
| `feedback/` | QA findings filed as GitHub issues |
| `middleware.ts` | Currently a no-op pass-through (Supabase auth gating is TODO) |
| `next.config.ts` | Build-critical env check + CORS headers |

App code is TypeScript, pipeline is plain `.mjs` — the pipeline stays runnable with plain `node`, no build step.

## Stack

Next.js 15 (App Router) · React 19 · Tailwind CSS 4 · Supabase (Postgres + Auth + RLS) · Vercel (hosting, `after()` for background work) · GitHub REST API · OpenAI-compatible LLM endpoint via `@anthropic-ai/sdk` · Marp for slides.

## Commands

```bash
npm run dev                        # http://localhost:3000
npm run build                      # production build (fails fast on missing build-critical env)
npm run lint
npm run generate owner/repo        # CLI: generate locally, writes projects.json instead of Supabase
```

Marp slides (from repo root):
```bash
npx @marp-team/marp-cli slides/tech-stack.md --preview
npx @marp-team/marp-cli slides/tech-stack.md -o slides/tech-stack.html
```

Diagnosing a run or reviewing an entry: see **Skills and agents** below.

## Environment variables

Load from `.env.local` (copy `.env.example`); production values live in Vercel → Settings → Environment Variables.

**Build-critical** — `next.config.ts` throws during `phase-production-build` if any is missing:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

**Runtime-critical** — build warns, features fail without them:
- `GITHUB_TOKEN` — local/CLI fallback; real generation uses `profiles.github_access_token`
- `ANTHROPIC_BASE_URL` — include `/v1` (or the gateway's compatible-mode path)
- `ANTHROPIC_API_KEY`
- `ANALYZER_MODEL` — e.g. `qwen3.5-plus`
- `NEXT_PUBLIC_BASE_URL`

**Optional:** `PIPELINE_CONCURRENCY` (default `4`), `PROJECTS_JSON_PATH` (CLI output target).

> **Vercel env changes require a redeploy.** And `NEXT_PUBLIC_*` values are inlined at *build* time — changing one needs a rebuild, not just a restart. Forgetting this is the single most common cause of "I fixed it but it still fails".

## Data model

Five tables (`supabase/migrations/001_initial.sql`), all with RLS enabled:

| Table | Keys | Notes |
|---|---|---|
| `profiles` | `id` (= `auth.users.id`), `github_id`, `github_login` | plus `github_access_token` (migration 002) |
| `selected_repos` | `profile_id`, `github_repo`, `github_url`, `included` | `UNIQUE(profile_id, github_repo)` |
| `runs` | `id`, `profile_id`, `username`, `status`, `error`, `started_at`, `finished_at` | `status` ∈ `pending, fetching, analyzing, publishing, success, failed` |
| `project_entries` | `run_id`, `repo_name`, `entry` (JSONB) | one row per generated project |
| `custom_domains` | `domain`, `verified`, `verifiable` | collected but not yet verified/routed — see `feedback/issues.md` |

**Entry schema** (the `entry` JSONB, also the V1 `projects.json` element):

`id` (kebab-case) · `title` · `summary` · `repo_url` · `tech_stack` (array, **relevance-ordered, never alphabetical**) · `problem_solved` · `how_i_solved_it` · `status` (`in_progress|completed|archived`) · `last_updated` (ISO 8601) · `demo_url` (string or null) · `evidence_level` (`commit_history|readme_only`).

Enforced by `pipeline/validate.mjs` → `validateEntry()`.

## Pipeline stages

`pipeline/index.mjs` exports `orchestrate({ profileId, username, selectedRepos, githubToken, runId })`, called from `app/api/sync/route.ts` inside Vercel's `after()` so the request returns immediately.

```
POST /api/sync
  → creates run row (status: pending) → returns runId → browser navigates to /generate/[runId]
  → after(): orchestrate()
       fetch     fetcher.mjs     GitHub REST — README, metadata, commit hotspots (no git clone)
       analyze   analyzer.mjs    LLM → one JSON entry (OpenAI-compatible /chat/completions)
       validate  validate.mjs    validateEntry() — invalid entry throws, that repo fails
       publish   publisher.mjs   insert into project_entries
     → runs.status = success | failed (finished_at + error always written by the finalizer)
  → browser polls GET /api/status/[runId]
```

- Repos run through a **bounded pool** (`PIPELINE_CONCURRENCY`, default 4) via `Promise.all` + cursor.
- One bad repo never stops the pool: its failure is recorded in `failureDetails`, appended to `runs.error` as `"N of M repo(s) failed — repo: cause | repo: cause"`, and the run still finishes `success` if ≥1 repo succeeded.
- Per-repo errors are logged with a `[pipeline]` prefix.

### Evidence rules

**Evidence-based only.** Every `problem_solved` and `how_i_solved_it` must be grounded in commit history, not README paraphrasing. Thin evidence (under 10 commits, no usable hotspots) → `evidence_level: readme_only`, framed as a learning challenge rather than fake production depth. Never hallucinate a struggle the evidence doesn't support. Two sentences max per field. Never "various bugs" or "some issues". Solo vs. team framing follows contributor counts.

Full rules: `AGENTS.md` → *Critical rules*, and the prompt in `pipeline/analyzer.mjs`.

## Skills and agents

Developer tooling under `.claude/` — these are how you, the agent, work on this repo.

| File | Kind | Tools | Model | Use for |
|---|---|---|---|---|
| `.claude/skills/run-doctor/SKILL.md` | skill | — | — | Diagnosing a failed/stuck generation run end to end |
| `.claude/skills/entry-review/SKILL.md` | skill | — | — | Auditing generated entries against the evidence rules |
| `.claude/agents/run-diagnoser.md` | agent | Read, Bash | sonnet | Read-only root cause for one run → JSON verdict |
| `.claude/agents/entry-reviewer.md` | agent | none | sonnet | Grades one entry against the 8-rule rubric → JSON |

Typical pairings: **run-doctor** (orchestrator) + **run-diagnoser** (detail gatherer); **entry-review** (orchestrator) + **entry-reviewer** (pure reasoning).

Legacy V1 agents (`github-fetcher`, `github-analyzer`, `portfolio-publisher`) and the `update-portfolio` skill live in `legacy/.claude/` — reference only, do not restore them to `.claude/`.

## Maintenance conventions

- Commit messages: lowercase, scoped — `feat:`, `fix:`, `chore:`, `docs:`.
- Evidence rules changes go in three places: `pipeline/analyzer.mjs` (prompt), `AGENTS.md` (Critical rules), and the entry-review skill/agent (rubric). Keep them consistent.
- Schema changes need a new migration in `supabase/migrations/`, never an edit to an applied one.
- Open QA findings are filed as GitHub issues and summarized in `feedback/issues.md`.
- `legacy/` is frozen. Fixes go into current V2 code.
