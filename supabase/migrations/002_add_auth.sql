-- ProjectWizard: Authenticatie toevoegen
-- Voer dit uit via Supabase Dashboard > SQL Editor

-- user_id kolom toevoegen aan projects (nullable voor bestaande data)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Index voor snelle lookups per gebruiker
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);

-- Oude open RLS policies verwijderen
DROP POLICY IF EXISTS "projects_full_access" ON projects;

-- Nieuwe RLS policies: alleen eigen projecten
CREATE POLICY "projects_select_own" ON projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "projects_insert_own" ON projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "projects_update_own" ON projects
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "projects_delete_own" ON projects
  FOR DELETE USING (auth.uid() = user_id);

-- Service role key bypass RLS automatisch, dus de bestaande server-side code
-- (getSupabase() met service_role_key) blijft gewoon werken.
