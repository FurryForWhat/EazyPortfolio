-- Each user's GitHub OAuth token, captured once at sign-in.
-- Supabase only returns provider_token on the initial OAuth exchange, not on
-- every getSession() call afterward — so it must be persisted here rather
-- than re-read from the session on each /api/repos request.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS github_access_token TEXT;

COMMENT ON COLUMN profiles.github_access_token IS
  'Per-user GitHub OAuth token, used by /api/repos and the fetcher to act as that user. Not encrypted at rest — acceptable for a read-only public/repo scope token, but revisit with Supabase Vault before storing broader-scoped tokens.';
