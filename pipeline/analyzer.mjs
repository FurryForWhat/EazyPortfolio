const SYSTEM_PROMPT = `You turn raw GitHub repo evidence into one JSON object matching a portfolio's projects.json schema. Output is shown directly on a portfolio webpage — it must be consistent, evidence-based, and free of filler language.

INPUT: a JSON object with repo_metadata (name, url, last_updated, total_commits, contributors[]), readme_content, hotspot_files[], hotspot_commit_messages{}.

PROCESS:
1. Check contribution scope FIRST. If repo_metadata.contributors shows multiple people and the user isn't the overwhelming majority committer, this is a team contribution, not a solo project — frame it that way (see hard rules).
2. Read readme_content for stated purpose, tech stack, setup.
3. Scan hotspot_files and hotspot_commit_messages for what went wrong and how it was fixed. Repeated fix/bug/revert/workaround = a genuine struggle. A messy sequence followed by refactor/rewrite = a resolved design problem. Steady feature commits with no fix/revert pattern = actively developed, not necessarily a problem area — don't force a struggle narrative onto it.
4. Pick the single most evidenced struggle across all hotspot files. One well-evidenced problem beats five vague ones. For team contributions, pick a struggle the user personally worked on.
5. Write problem_solved as the specific technical difficulty, named concretely.
6. Write how_i_solved_it as the resolution implied by the commit sequence.
7. Determine status: "in_progress" if last_updated is within 30 days of now, "completed" if README states it or there's a stable release signal, "archived" otherwise.
8. If hotspot_files is empty (fewer than 10 total commits), fall back to README-only analysis and set evidence_level to "readme_only". Otherwise "commit_history".

HARD RULES:
- Never write "various bugs" or "some issues" — name the specific thing that was wrong.
- Never fabricate a struggle the evidence doesn't support. It's fine for problem_solved to describe a design decision instead of a bug.
- summary, problem_solved, and how_i_solved_it are each capped at 2 sentences.
- Contribution scope: if multiple contributors and the user isn't the dominant one, avoid "I built"/"I shipped"/"I created the whole thing" — use "I contributed", "I owned the X layer", "I was responsible for Y feature". If the repo is a fork or lives in another org, frame it as navigating inherited architecture, not greenfield building. When in doubt, err toward humility — employers check the contributor graph.
- readme_only entries: never imply deep engineering ("built from scratch", "shipped", "solved complex problem"). Frame as learning/exploration ("practice repo", "learning sandbox", "exercises from coursework"). problem_solved describes the learning challenge, how_i_solved_it describes the study method — not fake production work.
- If tech_stack can't be confidently determined, omit uncertain entries rather than guessing.

OUTPUT: return exactly this JSON shape and nothing else — no markdown fences, no commentary, no preamble:
{
  "id": "kebab-case-repo-name",
  "title": "Human Readable Title",
  "repo_url": "https://github.com/...",
  "summary": "Two sentences max, plain language, no marketing tone.",
  "tech_stack": ["Java 21", "Spring Boot 3", "PostgreSQL"],
  "problem_solved": "One specific, concrete technical difficulty.",
  "how_i_solved_it": "One specific resolution, grounded in commit evidence.",
  "status": "in_progress | completed | archived",
  "last_updated": "ISO 8601 date",
  "demo_url": "string or null",
  "evidence_level": "commit_history | readme_only"
}`;

/**
 * Calls the model over the OpenAI-compatible /chat/completions shape.
 * Works against any OpenAI-compatible endpoint, including Alibaba's
 * DashScope / Bailian MaaS gateway (ANTHROPIC_BASE_URL ending in
 * .../compatible-mode/v1), which speaks the OpenAI request shape rather
 * than Anthropic's /v1/messages.
 *
 * Env vars (names kept for backwards compatibility with the Anthropic-shape version):
 *   ANTHROPIC_BASE_URL — base URL incl. /v1, e.g. https://.../compatible-mode/v1
 *   ANTHROPIC_API_KEY  — bearer key (DashScope sk-... or OpenAI sk-...)
 *   ANALYZER_MODEL     — model id, e.g. qwen3.7-flash
 */
export async function analyzeRepo(evidence, { baseUrl, apiKey, model } = {}) {
  const rawBase = baseUrl || process.env.ANTHROPIC_BASE_URL || 'https://api.openai.com/v1';
  const key = apiKey || process.env.ANTHROPIC_API_KEY;
  const modelName = model || process.env.ANALYZER_MODEL || 'qwen3.5-plus';

  if (!key) {
    throw new Error(`Missing API key: set ANTHROPIC_API_KEY (or pass apiKey) in the environment. 
Environment variables available: 
  ANTHROPIC_BASE_URL: ${process.env.ANTHROPIC_BASE_URL ? 'SET' : 'NOT SET'}
  ANALYZER_MODEL: ${process.env.ANALYZER_MODEL ? 'SET' : 'NOT SET'}
  GITHUB_TOKEN: ${process.env.GITHUB_TOKEN ? 'SET' : 'NOT SET'}`);
  }

  // Normalise trailing slash. Callers store the base already including the
  // /v1 version segment, so we append /chat/completions directly.
  const base = rawBase.replace(/\/+$/, '');
  const endpoint = `${base}/chat/completions`;

  const payload = JSON.stringify({
    model: modelName,
    // Reasoning models (glm-5.3-flash etc.) spend tokens on
    // reasoning_content before emitting content — raise via
    // ANALYZER_MAX_TOKENS (8192+) for those. Non-reasoning models
    // finish well under 2048.
    max_tokens: Number(process.env.ANALYZER_MAX_TOKENS) || 2048,
    temperature: 0.2,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: JSON.stringify(evidence, null, 2) },
    ],
  });

  async function attempt() {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: payload,
    }).catch((err) => {
      // DNS/reset/timeouts — treat as transient below.
      err.transient = true;
      throw err;
    });

    if (!res.ok) {
      const bodyText = await res.text();
      const err = new Error(`Analyzer API call failed: ${res.status} ${bodyText}`);
      // 429 (rate limit) and 5xx (upstream overload) are worth retrying;
      // 4xx auth/validation errors are not.
      err.transient = res.status === 429 || res.status >= 500;
      throw err;
    }

    const data = await res.json();
    const choice = data.choices?.[0]?.message;
    const text = (choice?.content || '').toString().trim();

    if (!text) {
      const reason = data.choices?.[0]?.finish_reason || 'unknown';
      const reasoning = (choice?.reasoning_content || '').slice(0, 300);
      const err = new Error(
        `Analyzer returned empty content (finish_reason: ${reason}). ` +
        `Reasoning models exhaust max_tokens before producing content — raise ANALYZER_MAX_TOKENS.` +
        (reasoning ? `\nReasoning started with: ${reasoning}` : '')
      );
      err.transient = true; // often a loaded endpoint truncating output
      throw err;
    }

    try {
      // Tolerate ```json fences some models wrap around the object.
      return JSON.parse(text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, ''));
    } catch (e) {
      const err = new Error(`Analyzer did not return valid JSON: ${e.message}\nRaw output:\n${text}`);
      err.transient = true;
      throw err;
    }
  }

  // NIM endpoints intermittently answer 503 "Service temporarily overloaded"
  // and occasionally return junk under load — retry with backoff.
  const maxAttempts = Math.max(1, Number(process.env.ANALYZER_RETRIES) || 6);
  let lastErr;
  for (let i = 1; i <= maxAttempts; i++) {
    try {
      return await attempt();
    } catch (err) {
      lastErr = err;
      if (!err.transient || i === maxAttempts) break;
      const delay = 1000 * 2 ** (i - 1) + Math.floor(Math.random() * 500);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}
