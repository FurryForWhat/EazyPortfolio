---
name: run-doctor
description: Diagnose a failed or stuck EazyPortfolio generation run — pulls the run row and its project_entries from Supabase, classifies the root cause (analyzer 403/env, GitHub 401/404, stuck fetching, validation failure), and prescribes the fix. Use when the user mentions a failed or stuck generation, pastes a run id, or says the progress page has been spinning on fetching/analyzing.
---

# Run Doctor

You diagnose one generation run and report a single classified root cause with a fix. You read data; you do not repair the run, edit env vars, or redeploy unless the user explicitly asks afterward.

## 1. Identify the run

Accept any of: a run UUID, a username, or a URL containing `/generate/<uuid>`. If you only have a username, find its most recent run:

```bash
curl -s "$SUPABASE_URL/rest/v1/runs?select=id,status,error,started_at,finished_at,username&username=eq.<username>&order=started_at.desc&limit=1" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

Load credentials from `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`). Never print the service role key. If `.env.local` has no Supabase creds, say so and stop — do not guess a URL.

Then pull the run with its error field and its entries:

```bash
curl -s "$SUPABASE_URL/rest/v1/runs?id=eq.<runId>&select=*" ...
curl -s "$SUPABASE_URL/rest/v1/project_entries?run_id=eq.<runId>&select=repo_name,created_at" ...
```

`project_entries` missing or empty while status is `publishing`/`success` means nothing was ever saved — treat that as a total failure, not a partial one.

## 2. Classify

Work top to bottom; the first match wins.

| Signal | Class | Prescribed fix |
|---|---|---|
| `status = pending` or `fetching` with `finished_at IS NULL` and `started_at` older than ~15 min | **stuck_fetching** | The `after()` background task in `app/api/sync/route.ts` was killed or timed out — no finalizer ever ran. Add a timeout/finalizer (see `feedback/issues.md` #2). For now, re-run the sync; the run row will never self-heal. |
| `status = failed` and `error` matches `analyzer`, `401`, `403`, `429`, or mentions the model/LLM | **analyzer_env** | Wrong or missing Anthropic-compatible env on Vercel: `ANTHROPIC_BASE_URL`, `ANTHROPIC_API_KEY`, `ANALYZER_MODEL`. Check the Vercel dashboard → Settings → Environment Variables, fix, then **redeploy** — `ANTHROPIC_*` are read at runtime but `NEXT_PUBLIC_*` are baked at build, and env changes never take effect on an already-deployed build. |
| `status = failed` and `error` matches `GitHub`, `401`, `404`, `Bad credentials`, `rate limit` | **github_auth** | `profiles.github_access_token` is missing, expired, revoked, or lacks `repo` scope; or the repo is private/the name is wrong. Have the user re-connect GitHub in the dashboard to refresh the token. Shared `GITHUB_TOKEN` is only a local-testing fallback. |
| `status = failed` and `error` starts with `Validation failed:` | **validation** | The analyzer produced a malformed entry. Copy the field names out of the message and run **entry-review** on that entry shape; the fix is usually in `pipeline/validate.mjs` or the analyzer prompt. |
| `status = failed` and `error` matches `Missing SUPABASE` / `Missing .* env` | **server_env** | Serverless env missing `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` (or `GITHUB_TOKEN` for CLI runs). Add on Vercel + locally in `.env.local`, then redeploy. |
| `error` contains `X of N repo(s) failed` | **partial** | Per-repo causes are appended after the em dash. Split on ` | `, diagnose each fragment against this same table, and report one line per repo. |
| `status = failed` and nothing matches | **unknown** | Report the raw `error` verbatim plus the run id and ask the user for the Vercel function log for `/api/sync`. |

## 3. Report

Return exactly four things, plainly:

1. **Run** — id, username, status, started/finished timestamps.
2. **Class** — one of the table labels above.
3. **Evidence** — the specific field value that decided it (`error` text, `finished_at`, entry count).
4. **Fix** — the prescribed fix, marked as either *do this now* or *needs a code change*.

Do not paste raw JSON blobs into the answer. If two classes remain equally likely, say which two and name the single next observation that would separate them.

## Gotchas worth repeating

- Vercel env edits require a redeploy to take effect.
- `NEXT_PUBLIC_*` values are frozen at build time — changing them needs a rebuild, not just a redeploy.
- A run stuck in `fetching` is never rescued by waiting; `finished_at` only gets written by the finalizer in `orchestrate()`.
- Reading these tables with the service role key bypasses RLS by design — do not use the anon key here, it will silently return zero rows for another user's run.
