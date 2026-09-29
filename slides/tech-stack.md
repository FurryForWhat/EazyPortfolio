---
marp: true
paginate: true
transition: fade
theme: default
style: |
  section {
    background: #0d1117;
    color: #e6edf3;
    font-family: 'Segoe UI', sans-serif;
  }
  h1 { color: #58a6ff; font-size: 2rem; }
  h2 { color: #3fb950; font-size: 1.4rem; }
  table { font-size: 0.9rem; }
  th { color: #58a6ff; text-align: left; }
  td { color: #e6edf3; padding: 2px 14px 2px 0; }
  code { background: #161b22; color: #f0883e; padding: 2px 8px; border-radius: 4px; }
  .label { color: #8b949e; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 2px; }
  ul { list-style: none; padding: 0; }
  li::before { content: "→ "; color: #58a6ff; }
---

<!-- SLIDE 1 — Cover -->

<span class="label">Tech stack · V2</span>

# EazyPortfolio V2

<br>

## GitHub → portfolio, self-serve

<br>

Sign in · pick repos · generate · live at `/{username}`

**eazy-portfolio-eight.vercel.app**

---

<!-- SLIDE 2 — Tech stack -->

# The stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 — App Router |
| UI | React 19 · Tailwind CSS 4 · lucide-react · sonner |
| Data | Supabase — Postgres, Auth, Row Level Security |
| Hosting | Vercel — serverless + `after()` background work |
| Evidence | GitHub REST API — **no git clone** |
| Analysis | OpenAI-compatible LLM endpoint (`ANTHROPIC_BASE_URL` + `ANALYZER_MODEL`) |
| Slides | Marp |

TypeScript for `app/`, plain `.mjs` for `pipeline/` — the pipeline runs on bare `node`, no build step.

---

<!-- SLIDE 3 — Architecture / flow -->

# Architecture

```text
POST /api/sync
  └─ creates runs row (pending) → returns runId
       └─ after(): orchestrate()
            fetch   → GitHub REST: README, metadata, commit hotspots
            analyze → LLM: one JSON entry
            validate→ validateEntry() in pipeline/validate.mjs
            publish → insert project_entries (Supabase)
       → runs.status: success | failed
  browser polls GET /api/status/[runId]
  page renders at /[username]
```

Bounded pool: `PIPELINE_CONCURRENCY`, default **4** repos in flight.

---

<!-- SLIDE 4 — Agents -->

# Agents

| Agent | Tools | Model | Job |
|---|---|---|---|
| `run-diagnoser` | Read, Bash | sonnet | Read-only root cause for one run → JSON verdict |
| `entry-reviewer` | none | sonnet | Grades one entry against an 8-rule rubric → JSON |

- `run-diagnoser` classifies `stuck_fetching` · `analyzer_env` · `github_auth` · `validation` · `server_env` · `partial` · `unknown`
- `entry-reviewer` is pure reasoning — no repo access, no network, `UNVERIFIED` when evidence is absent
- V1 legacy agents (`github-fetcher`, `github-analyzer`, `portfolio-publisher`) frozen in `legacy/.claude/`

---

<!-- SLIDE 5 — Skills -->

# Skills

| Skill | Trigger | Does |
|---|---|---|
| `run-doctor` | failed/stuck run, pasted run id | Pulls `runs` + `project_entries`, classifies, prescribes fix |
| `entry-review` | post-run QA on an entry | Runs `validateEntry()` + evidence rules, checklist verdict |

- `.claude/` is **not** gitignored — skills ship with the repo
- Pairing: **run-doctor** + **run-diagnoser** · **entry-review** + **entry-reviewer**
- V1 `update-portfolio` skill lives on in `legacy/` as reference

---

<!-- SLIDE 6 — Methodology -->

# Methodology

- **Evidence-based only** — every `problem_solved` / `how_i_solved_it` comes from commit history, never README paraphrase
- Thin evidence → `evidence_level: readme_only`, framed as learning, never fake depth
- **Bounded concurrency** — one failing repo never blocks the pool
- **RLS** — profiles, selected_repos, runs, project_entries, custom_domains all row-secured; service role bypasses only inside verified API routes
- **Fail visibly** — per-repo errors land in `runs.error`, not a bare failure count
- **Consistency** — analyzer prompt · `AGENTS.md` rules · entry-review rubric change together

---

<!-- SLIDE 7 — Trigger -->

# Trigger

<br>

## Natural language is enough

<br>

- "diagnose run `5ea19b31-10cb-46e6-aea0-ed2f683fd01e`"
- "the progress page is stuck on **fetching**"
- "use run-doctor on this run id"
- "review this entry — is it evidence-based?"

<br>

`run-doctor` resolves username → latest run when no id is given.

---

<!-- SLIDE 8 — Commands -->

# Commands

```bash
npm run dev      # localhost:3000
npm run build    # fails fast on missing build-critical env
npm run lint
npm run generate owner/repo   # CLI path → projects.json
```

Slides:
```bash
npx @marp-team/marp-cli slides/tech-stack.md --preview
```

Gate for chapter submissions:
```bash
bash ~/vibeCodeV2/vibecode-setup/doctor.sh ch-5
```

---

<!-- SLIDE 9 — Links -->

# Links

<br>

- **Live** — `eazy-portfolio-eight.vercel.app`
- **Repo** — `github.com/FurryForWhat/EazyPortfolio`
- **Docs** — `CLAUDE.md` (V2 system) · `AGENTS.md` (rules)
- **Skills** — `.claude/skills/run-doctor/`, `.claude/skills/entry-review/`
- **Agents** — `.claude/agents/run-diagnoser.md`, `.claude/agents/entry-reviewer.md`
- **QA** — `feedback/issues.md` + GitHub issues
- **Deck** — `slides/tech-stack.md`

<br>

`evidence · concurrency · RLS · fail visibly`
