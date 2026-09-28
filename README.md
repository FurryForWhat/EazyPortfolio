# EazyPortfolio

An AI agent pipeline that reads your GitHub commit history and auto-generates a portfolio of case-study-style project cards — no manual write-ups, no copy-paste, no README paraphrasing.

## What it does

Connect your GitHub account, pick a few repos, and EazyPortfolio produces a structured portfolio where each project answers two questions: **what went wrong** and **how you fixed it** — backed by actual commit evidence, not guesswork.

The pipeline has three stages:

1. **Fetcher** — pulls a repo's commit history via the GitHub API, finds the top commit hotspots (most-changed files), and extracts their full commit message history
2. **Analyzer** — calls an LLM (Qwen via DashScope, or Anthropic) to reason about the evidence and produce one structured entry per repo: problem solved, how it was solved, tech stack, status
3. **Publisher** — writes the entry to Supabase, tied to the user's account

## Architecture

- `app/`, `components/`, `lib/` — Next.js app: GitHub OAuth login, a dashboard to pick repos and trigger generation, and a public `/[username]` portfolio page per user. Route handlers live in `app/api/*` (data endpoints) and `app/auth/callback` (OAuth exchange)
- `pipeline/` — the fetch → analyze → publish logic, callable either as `orchestrate()` (used by `app/api/sync`, writes to Supabase) or as a CLI (`node pipeline/index.mjs owner/repo`, writes to a local JSON file for testing)
- `supabase/migrations/` — database schema: `profiles`, `selected_repos`, `runs`, `project_entries`, `custom_domains`, with row-level security so each user only sees their own data

## Setup

1. Create a Supabase project, run the files in `supabase/migrations/` in order (001 → 003) in the SQL Editor
2. Enable GitHub as an auth provider in Supabase (Authentication → Providers)
3. Copy `.env.example` to `.env.local` and fill in your Supabase, GitHub, and model API keys
4. `npm install && npm run dev`

## Legacy

`legacy/` holds the original single-user version of this project: a Claude Code Skills/Subagents pipeline (`.claude/`) that cloned repos locally and git-pushed a static `projects.json` to a personal portfolio site. It's kept for reference but is no longer the active architecture.
