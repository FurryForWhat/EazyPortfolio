-- Profiles (linked to GitHub auth.users)
CREATE TABLE profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  github_id    BIGINT UNIQUE NOT NULL,
  github_login TEXT UNIQUE NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- Selected repos per user
CREATE TABLE selected_repos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID REFERENCES profiles ON DELETE CASCADE,
  github_repo TEXT NOT NULL,
  github_url  TEXT NOT NULL,
  included    BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(profile_id, github_repo)
);

-- Sync runs
CREATE TABLE runs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles ON DELETE CASCADE,
  username   TEXT NOT NULL,
  status     TEXT CHECK (status IN ('pending','fetching','analyzing','publishing','success','failed')),
  error      TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  finished_at TIMESTAMPTZ
);

-- Project entries within a run
CREATE TABLE project_entries (
  run_id     UUID REFERENCES runs ON DELETE CASCADE,
  repo_name  TEXT NOT NULL,
  entry      JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Custom domain mappings
CREATE TABLE custom_domains (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles ON DELETE CASCADE,
  domain     TEXT UNIQUE NOT NULL,
  verified   BOOLEAN DEFAULT false,
  verifiable JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE selected_repos ENABLE ROW LEVEL SECURITY;
ALTER TABLE runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can manage own repos"
  ON selected_repos FOR ALL USING (auth.uid() = profile_id);

CREATE POLICY "Users can view own runs"
  ON runs FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY "Users can insert own runs"
  ON runs FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update own runs"
  ON runs FOR UPDATE USING (auth.uid() = profile_id);

CREATE POLICY "Users can manage own project entries"
  ON project_entries FOR ALL USING (
    EXISTS (SELECT 1 FROM runs WHERE runs.id = project_entries.run_id AND runs.profile_id = auth.uid())
  );

CREATE POLICY "Anyone can view public project entries"
  ON project_entries FOR SELECT USING (true);

CREATE POLICY "Users can manage own domains"
  ON custom_domains FOR ALL USING (auth.uid() = profile_id);

-- Indexes for performance
CREATE INDEX idx_selected_repos_profile ON selected_repos(profile_id);
CREATE INDEX idx_runs_username ON runs(username);
CREATE INDEX idx_runs_profile_status ON runs(profile_id, status);
CREATE INDEX idx_project_entries_run ON project_entries(run_id);
CREATE INDEX idx_custom_domains_domain ON custom_domains(domain);
