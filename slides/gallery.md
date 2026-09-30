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
  ul { list-style: none; }
  li::before { content: "→ "; color: #58a6ff; }
---

<!-- SLIDE 1 — Gallery card cover -->

<span class="label">Public gallery · Vibe Code Tours</span>

# EazyPortfolio

<br>

## Your GitHub commits become a portfolio — evidence, not marketing

<br>

`github.com/FurryForWhat/EazyPortfolio`

**Live: eazy-portfolio-eight.vercel.app**

---

<!-- SLIDE 2 — The problem -->

# The problem

- Portfolios rot: you ship code, but the write-up never gets updated
- READMEs describe intent, not what actually broke
- Copy-pasting "case studies" is slow and drifts from the truth

<br>

**EazyPortfolio reads the commit history you already have and writes the
case studies for you — then republishes them on every sync.**

---

<!-- SLIDE 3 — How it works -->

# Three stages, one API call

| Stage | Job | Where |
|---|---|---|
| **Fetcher** | GitHub REST — commits, top-5 hotspot files, README | `pipeline/fetcher.mjs` |
| **Analyzer** | LLM reasons over the evidence → one structured entry | `pipeline/analyzer.mjs` |
| **Publisher** | Validate → insert `project_entries` → run marked `success` | `pipeline/publisher.mjs` |

No `git clone`, no filesystem state — the pipeline runs inside
`POST /api/sync`'s background task (`after()`) and reports progress at
`GET /api/status/[runId]`.

---

<!-- SLIDE 4 — Evidence rules -->

# Evidence-based, or it doesn't ship

- Every `problem_solved` / `how_i_solved_it` must come from **commit evidence**
- Two sentences max each — no filler, never "various bugs"
- Thin history → `evidence_level: readme_only`, framed as learning
- Team repos → "I contributed / I owned the X layer", never "I built it all"
- `pipeline/validate.mjs` blocks a bad entry before it is written

---

<!-- SLIDE 5 — What's in the app -->

# The product

- **Sign in with GitHub** — OAuth, read-only scopes, token stored per profile
- **Dashboard** — pick repos, one click to generate, live progress page
- **Public portfolio** at `/{username}` — server-rendered, RLS-protected reads
- **Embeddable JSON** — `GET /api/export/{username}` with permissive CORS
- **Row Level Security** on every table; service role used only inside
  verified API routes

---

<!-- SLIDE 6 — Chapter 6 polish -->

# Chapter 6: shipped, tested, deployed

- 5 Ch-5 issues fixed and closed — selection snapshot, run reaper,
  public export, scoped CORS, custom-domain field removed until it works
- Playwright click-through (`npm run test:e2e`) + Chrome DevTools MCP
  console/responsive checks
- Vercel Web Analytics, polished README, MIT license
- Deployed on Vercel — screenshots at 1280×800 / 390×844

---

<!-- SLIDE 7 — Links -->

# Links

- **Live:** `https://eazy-portfolio-eight.vercel.app`
- **Source:** `https://github.com/FurryForWhat/EazyPortfolio`
- **Issues closed:** `github.com/FurryForWhat/EazyPortfolio/issues`
- **Docs for agents:** `AGENTS.md` · `CLAUDE.md`
- **Demo portfolio:** `eazy-portfolio-eight.vercel.app/mathet426`

<br>

`npm install && npm run dev` — MIT licensed.
