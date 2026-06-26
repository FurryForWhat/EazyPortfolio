<!--
  Marp template — "pitch-bold"
  Copy into your repo (e.g. slides/intro.md), replace content.
  Render:  marp slides/intro.md -o slides.html   (or .pdf / .png)
  Big type, high contrast — good for a fast PechaKucha-style pitch.
-->
---
marp: true
paginate: true
size: 16:9
---

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=JetBrains+Mono:wght@500&display=swap');
:root { --bg:#0a0a0a; --ink:#fafafa; --muted:#a3a3a3; --accent:#ffd60a; --code:#171717; }
section {
  background:var(--bg); color:var(--ink);
  font-family:'Inter','Noto Sans','Pyidaungsu',sans-serif;
  font-size:30px; line-height:1.4; padding:60px 76px; font-weight:400;
}
h1 { color:var(--accent); font-weight:900; font-size:2.1em; line-height:1.05; letter-spacing:-.02em; }
h2 { color:var(--ink); font-weight:700; font-size:1.4em; }
h3 { color:var(--muted); font-weight:700; }
strong { color:var(--accent); }
a { color:var(--accent); text-decoration:none; }
ul { font-weight:700; font-size:1.1em; }
code { background:var(--code); color:var(--accent); padding:.05em .3em; border-radius:5px; font-family:'JetBrains Mono',monospace; }
pre  { background:var(--code); border-radius:10px; }
pre code { background:none; color:#fafafa; }
blockquote { border-left:6px solid var(--accent); color:var(--muted); padding:.4em 1em; font-size:1.2em; }
header,footer,section::after { color:#525252; font-size:.5em; }
section.cover { background:linear-gradient(135deg,#0a0a0a 0%, #1a1400 100%); }
section.cover h1 { font-size:3em; }
section.lead { background:#111; }
section.lead h1 { font-size:3.4em; }
</style>

<!-- _class: cover -->

# EazyPortfolio

## An agent pipeline that turns commit history into a portfolio

**KoFurry** · @FurryForWhat

---

<!-- _class: lead -->

# The problem

Your commit history already tells your story — but recruiters don't read `git log`.

---

# The fix

- **What** — An agent pipeline that reads your GitHub repos and writes portfolio cards
- **Who** — Developers who build in public but never update their portfolio
- **Why** — The work should update the portfolio. Not the other way around.

---

# How it works

| Layer | Job |
|---|---|
| **Skills** | Define output rules + evidence requirements |
| **gh CLI** | Discover repos, clone, push |
| **Subagents** | Fetch → Analyze → Publish |
| **JSON** | Single source of truth |

One command: **`/update-portfolio`**

---

# Demo

![w:860](screenshots/01.png)
![w:860](screenshots/02.png)
![w:860](screenshots/03.png)

---

<!-- _class: lead -->

# Try it

**https://eazyportfolio-mewnhx83c-furry-s-team.vercel.app/**

github.com/FurryForWhat/EazyPortfolio · MIT