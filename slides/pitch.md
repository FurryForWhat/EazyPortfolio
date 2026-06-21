---
marp: true
paginate: true
transition: fade
auto-advance: 20
theme: default
style: |
  section {
    background: #0d1117;
    color: #e6edf3;
    font-family: 'Segoe UI', sans-serif;
  }
  h1 { color: #58a6ff; font-size: 2rem; }
  h2 { color: #3fb950; font-size: 1.4rem; }
  code { background: #161b22; color: #f0883e; padding: 2px 8px; border-radius: 4px; }
  .label { color: #8b949e; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 2px; }
  ul { list-style: none; padding: 0; }
  li::before { content: "→ "; color: #58a6ff; }
---

<!--
SLIDE 1 (0:00–0:20) — Who's my person? + Their problem
VISUAL IDEA:
  Left third: developer silhouette at a laptop, commit bubbles floating around
  ("fix bug", "wip", "refactor").
  Right two-thirds: terminal wall-of-text (raw git log) fading into a blank
  white portfolio page — the contrast is the point.
  One caption line at the very bottom: "The story is in there. Buried."
  Mood: quiet, slightly frustrating.
-->

# Who's my person? Their problem.

<br>

A developer who builds in public — pushes commits, closes issues, solves real problems.

<br>

`git log` already knows the whole story: what broke, where they struggled, how they fixed it.

**But that evidence dies inside the repo.** Recruiters don't read commit history. Even the developer forgets.

---

<!--
SLIDE 2 (0:20–0:40) — What I built
VISUAL IDEA:
  Clean 3-node flow: GitHub icon → glowing agent icon → portfolio card.
  The portfolio card shows: title, "CH:", "RES:" fields — visibly different
  from a plain README dump.
  One bold line under the flow: "/update-portfolio"
  Mood: elegant, inevitable.
-->

# What I built

<br>

## An agent pipeline that reads your repos and writes your story.

<br>

Push to GitHub → agent analyzes commit history → portfolio page auto-updates.

<br>

One command: **`/update-portfolio`**

---

<!--
SLIDE 3 (0:40–1:00) — How I built it
VISUAL IDEA:
  4 horizontal layered cards, each a slightly different dark shade, stacked
  top to bottom: Skills → MCP → Subagents → JSON. No arrows needed — the
  stack itself implies flow downward into the webpage.
  Mood: clean architecture, nothing wasted.
-->

# How I built it

<br>

| Layer | What it does |
|---|---|
| **Skills** | Rules + output format |
| **MCP** | GitHub read / write access |
| **Subagents** | Fetch → Analyze → Publish |
| **JSON** | Single source of truth |

<br>

Claude Code wrote the code. I wrote the rules.

---

<!--
SLIDE 4 (1:00–1:20) — MCP + Skill + Agent (the evidence slide)
VISUAL IDEA:
  Three equal columns, like three index cards side by side.
  Column 1 (MCP): GitHub Octocat icon, label "GitHub MCP Server",
    sub-label "read + write, shared by 2 agents"
  Column 2 (Skill): open markdown file icon, label "github-analyzer.skill.md",
    sub-label "commit-evidence rules, not guesses"
  Column 3 (Agent): three small robot icons stacked, label "fetcher · analyzer · publisher",
    sub-label "Haiku · Sonnet · Haiku"
  Mood: this is the proof-of-work slide — concrete, not abstract.
-->

# MCP · Skill · Agent

<br>

**MCP** — `.mcp.json`, GitHub server. Fetcher reads repos/commits, publisher writes JSON back.

**Skill** — `github-analyzer.skill.md`. Forces every "problem solved" to come from real commit evidence, not a guess.

**Agent** — `github-fetcher` (Haiku) → `github-analyzer` (Sonnet) → `portfolio-publisher` (Haiku). Reasoning only where it's needed.

---

<!--
SLIDE 5 (1:20–1:40) — Why it matters
VISUAL IDEA:
  Split screen. Left: terminal running /update-portfolio with clean output
  ("✓ 7 checked · 2 updated · Published"). Right: one polished portfolio
  card showing CH:/RES: fields. Before (terminal) and after (card), nothing else.
  Mood: satisfying payoff.
-->

# Why it matters

<br>

Your commit history already contains your story. This pipeline just **reads it and tells it.**

<br>

Recruiters see problems you solved, not just tech you used.
You remember what you actually built.
Portfolio stays fresh without touching it.

**The work updates the portfolio. Not the other way around.**

---

<!--
SLIDE 6 (1:40–2:00) — Done checklist
VISUAL IDEA:
  Dark card centered on screen. Three checklist items with large checkboxes:
    ☐ repo public
    ☐ MCP + skill + agent used
    ☐ report.md in team repo
  Small icon beside each (GitHub mark, puzzle piece, document).
  Bottom right, small text: "FurryForWhat · June 2026"
  Mood: clean closure, ship it.
-->

# Done checklist

<br>

- [ ] repo public
- [ ] MCP + skill + agent used
- [ ] report.md in team repo

<br><br>

**Stack:** Claude Code · GitHub MCP · Skills · Subagents · Vercel

**One command ships it all: `/update-portfolio`**
