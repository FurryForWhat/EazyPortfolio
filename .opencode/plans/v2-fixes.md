# EazyPortfolio V2 — Fix Plan (All 8 Issues)

## Overview

Fixes applied to scaffolded V2 codebase to resolve bugs, missing features, and design gaps identified during audit.

---

## Fix 1: `api/auth/callback/route.ts` — Wrong client + missing profile creation

**Severity:** Bug (will break first-time user sign-in)

**Problem:** Uses `createMiddlewareClient` (meant for middleware, not API routes). After OAuth exchange succeeds, never creates the `profiles` row, so users hit a 404 on `/dashboard`.

**Changes:**
- Replace `createMiddlewareClient` with `createRouteHandlerClient({ cookies })`
- After OAuth exchange, check if profile exists in Supabase
- If no profile, create one with `id`, `github_id`, `github_login` (same logic as `dashboard/page.tsx`)
- Then redirect to `/dashboard`

**File:** `api/auth/callback/route.ts`

---

## Fix 2: `middleware.ts` — Matcher excludes ALL API routes

**Severity:** Bug (breaks session checks on `/api/sync`, `/api/repos`, `/api/status/*`)

**Problem:** Exclusion pattern `api/.*` blocks all API routes from middleware. They rely on manual auth checks inside each route, which is inconsistent and fragile.

**Changes:**
- Change exclusion from `api/.*` to `api/auth/callback` (only the callback handles its own session via cookie redirect)
- All other API routes (`/api/sync`, `/api/repos`, `/api/status/*`, `/api/logout`, `/api/export`) now run through middleware for proper session refresh

**File:** `middleware.ts`

---

## Fix 3: Missing `POST /api/logout` endpoint

**Severity:** Feature gap (users can't sign out)

**Changes:**
- Create new file `api/logout/route.ts`
- Call `supabase.auth.signOut()` using `createRouteHandlerClient`
- Redirect to `/` after logout

**New file:** `api/logout/route.ts`

---

## Fix 4: Missing export/download endpoint for self-hosting

**Severity:** Feature gap (Path B — user downloads HTML + deploys themselves — has no backend support)

**Changes:**
- Create new file `api/export/[username]/route.ts`
- Query Supabase for the user's latest successful run
- Return `projects.json` format (array of project entries) as JSON response
- Include CORS headers so user's self-hosted page can fetch it cross-origin
- Handle case where no successful run exists (return empty array)

**New file:** `api/export/[username]/route.ts`

---

## Fix 5: `web/app/dashboard/page.tsx` — Hardcoded preview instead of real data

**Severity:** Design issue (renders fake projects instead of user's actual portfolio)

**Problem:** Dashboard component renders hardcoded projects at the bottom of the page instead of fetching the user's actual runs/projects from Supabase.

**Changes:**
- In `dashboard/page.tsx`, query Supabase for the user's latest successful run
- Fetch project entries from that run
- Pass them to `<Dashboard>` component
- Replace hardcoded list with real projects rendered via `<PortfolioCard>`
- Show "No projects yet" message if no runs exist

**Files:** `web/app/dashboard/page.tsx`, `web/components/dashboard.tsx`

---

## Fix 6: `web/app/[username]/page.tsx` — Build-time static params won't catch new portfolios

**Severity:** Design issue (new portfolios invisible until next Vercel rebuild)

**Problem:** `generateStaticParams()` queries Supabase at build time. Portfolios generated after deployment won't appear until the next Vercel deploy.

**Changes:**
- Add `export const dynamic = 'force-dynamic'` to force request-time rendering
- Add `export const revalidate = 60` for ISR — fresh enough but cached
- Remove `generateStaticParams()` (no longer needed with dynamic rendering)

**File:** `web/app/[username]/page.tsx`

---

## Fix 7: `web/app/generate/[runId]/page.tsx` — Next.js 15 deferred props compatibility

**Severity:** Compatibility concern (Next.js 15 syntax may break on downgrade)

**Problem:** Uses `params: Promise<{ runId: string }>` which is Next.js 15 deferred props syntax.

**Changes:**
- Verify `next` version in `package.json` is pinned to `"^15.2.0"` (already correct)
- Keep current syntax since we're pinning to Next.js 15+
- Add comment noting this requires Next.js 15+

**Files:** `package.json` (verify), `web/app/generate/[runId]/page.tsx` (add comment)

---

## Fix 8: `api/repos/route.ts` — GitHub rate limit awareness

**Severity:** Note (no immediate fix needed, awareness-level guidance)

**Problem:** Fetches repos using your single `GITHUB_TOKEN`. Rate limit for authenticated requests is 5,000/hr. At scale, could hit limits.

**Changes:**
- Add comment block at top of file noting:
  - Uses shared `GITHUB_TOKEN` (not per-user tokens)
  - Authenticated rate limit: 5,000/hr
  - Consider caching results (Redis/in-memory TTL) at scale
  - Per-user tokens would give 15,000/hr but require user token management

**File:** `api/repos/route.ts`

---

## Summary of Changes

| # | File | Action | Severity |
|---|---|---|---|
| 1 | `api/auth/callback/route.ts` | Edit — fix client + add profile creation | Bug |
| 2 | `middleware.ts` | Edit — narrow matcher exclusion | Bug |
| 3 | `api/logout/route.ts` | **New** — logout endpoint | Feature |
| 4 | `api/export/[username]/route.ts` | **New** — export projects.json | Feature |
| 5 | `web/app/dashboard/page.tsx` | Edit — fetch real runs | Design |
| 6 | `web/app/[username]/page.tsx` | Edit — add dynamic + revalidate | Design |
| 7 | `package.json` | Verify Next.js 15 pin | Compat |
| 8 | `api/repos/route.ts` | Add rate limit comment | Note |
