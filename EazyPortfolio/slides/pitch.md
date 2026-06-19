---
marp: true
paginate: true
transition: fade
auto-advance: 20
theme: default
style: |
  section {
    background: #0d1117;
    color: #93b3d0;
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
SLIDE 1 — Who's my person?
VISUAL IDEA:
  Dark background. Center: simple icon of a developer (laptop silhouette).
  Around them: floating GitHub logo, commit bubbles ("fix bug", "add feature", "refactor").
  Bottom corner: small text "commit after commit, the story disappears."
  Mood: quiet, slightly lonely. No clutter.
-->

# Who's my person?

<br>

## A developer who builds things in public.

<br>

They push commits.
They close issues.
They solve real problems.

<br>

**But nobody — including them — can tell the story afterward.**

---

<!--
SLIDE 2 — Their problem
VISUAL IDEA:
  Left half: terminal window showing raw `git log` output — wall of text,
  timestamps, cryptic messages ("fix", "wip", "tmp2", "revert revert").
  Right half: a visitor looking at a blank portfolio page, big empty white space.
  One line at bottom center: "The story is in there. Buried."
  Mood: frustrating contrast.
-->

# Their problem

<br>

`git log` knows everything.

- Which files broke the most
- Where they struggled hardest
- How they eventually fixed it

<br>

**That evidence dies inside the repo.**
Recruiters don't read commit history.
Even the developer forgets.

---

<!--
SLIDE 3 — What I built
VISUAL IDEA:
  Clean 3-node flow: GitHub icon → robot/agent icon (glowing) → portfolio card.
  The portfolio card shows: title, "Challenge:", "Resolution:" fields — not just a README.
  One bold line below: "/update-portfolio"
  Mood: elegant, inevitable, like it was always supposed to work this way.
-->

# What I built

<br>

## An agent pipeline that reads your repos and writes your story.

<br>

Push to GitHub →
Agent analyzes commit history →
Portfolio page auto-updates.

<br>

One command: **`/update-portfolio`**

---

<!--
SLIDE 4 — How I built it
VISUAL IDEA:
  4 horizontal layers stacked like cards, each a slightly different dark shade:
    Layer 1 (top): "Skills  →  rules + output format"
    Layer 2:        "MCP     →  GitHub read/write access"
    Layer 3:        "Subagents → fetch · analyze · publish"
    Layer 4 (bottom): "projects.json → portfolio webpage"
  No arrows needed — the stack itself implies flow.
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

Zero boilerplate from scratch.
Claude Code wrote the code.
I wrote the rules.

---

<!--
SLIDE 5 — MCP: …
VISUAL IDEA:
  Center: GitHub Octocat icon inside a glowing circle labeled "GitHub MCP Server".
  Two arrows branching out left and right:
    Left:  "github-fetcher   →  reads repos, commits, README"
    Right: "portfolio-publisher → writes JSON, git push"
  Bottom: small note "one MCP server, two subagents share it"
  Mood: efficient, multiplied.
-->

# MCP: GitHub as the agent's hands

<br>

**GitHub MCP Server** connects Claude to the entire repo.

<br>

- `github-fetcher` reads: repos, commits, README
- `portfolio-publisher` writes: JSON → git push

<br>

One MCP server.
Two subagents. Both directions.
**No custom API wrapper needed.**

---

<!--
SLIDE 6 — Skill: …
VISUAL IDEA:
  Open markdown file visual (code block style), showing just two key fields:
    "problem_solved":  "one concrete technical difficulty"
    "how_i_solved_it": "resolution grounded in commit evidence"
  Below the code block, two columns:
    WITHOUT skill → "various bugs 🤷"
    WITH skill    → "currency rounding fixed via Money value object ✓"
  Mood: precision beats guessing.
-->

# Skill: the contract between agents

<br>

`github-analyzer.skill.md` tells the analyzer:

- Where to look (commit hotspots, not just README)
- What counts as a "real problem"
- How long each field can be
- What to do when evidence is missing

<br>

**Without it:** vague summaries, inconsistent JSON.
**With it:** every project card sounds like a case study.

---

<!--
SLIDE 7 — Agent: …
VISUAL IDEA:
  Three boxes in a horizontal row, connected by arrows:
    Box 1: "github-fetcher"    label: "Haiku  |  Bash + Read tools"
    Box 2: "github-analyzer"   label: "Sonnet |  no tools, skill preloaded"
    Box 3: "portfolio-publisher" label: "Haiku |  Bash + Write tools"
  Below each box: one-line job description.
  At bottom: "model matched to task complexity = cheaper + faster"
  Mood: each agent doing exactly one thing well.
-->

# Agent: three specialists, one pipeline

<br>

| Subagent | Model | Job |
|---|---|---|
| `github-fetcher` | Haiku | Clone repo, extract hotspots |
| `github-analyzer` | Sonnet | Reason about evidence → JSON |
| `portfolio-publisher` | Haiku | Merge JSON, git push |

<br>

Reasoning where it's needed.
Speed where it's not.

---

<!--
SLIDE 8 — Why it matters
VISUAL IDEA:
  Split screen. Left: a terminal running `/update-portfolio` — clean output:
    "✓ 7 repos processed"
    "✓ 2 updated"
    "✓ Published."
  Right: a polished portfolio card showing:
    Project title
    "Challenge: ..."
    "Resolution: ..."
  No clutter. Just the before (terminal) and after (card).
  Mood: satisfying payoff.
-->

# Why it matters

<br>

Your commit history already contains your story.

This pipeline just **reads it and tells it.**

<br>

- Recruiters see problems you solved, not just tech you used
- You remember what you actually built
- Portfolio stays fresh without touching it

<br>

**The work updates the portfolio. Not the other way around.**

---

<!--
SLIDE 9 — Done checklist
VISUAL IDEA:
  Dark card centered on screen. Three checklist items with large checkboxes:
    ☐  repo public
    ☐  MCP + skill + agent used
    ☐  report.md in team repo
  Each item has a subtle icon next to it (GitHub mark, puzzle piece, document).
  Bottom right: small text — "Furry · June 2026"
  Mood: clean closure. Ship it.
-->

# Done checklist

<br>

- [ ] repo public
- [ ] MCP + skill + agent used
- [ ] report.md in team repo

<br><br>

**Stack:** Claude Code · GitHub MCP · Skills · Subagents · Vercel

**One command ships it all: `/update-portfolio`**