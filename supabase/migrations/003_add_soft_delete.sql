-- ProjectWizard: Soft-delete voor projecten
-- Voer dit uit via Supabase Dashboard > SQL Editor

-- deleted_at kolom toevoegen (NULL = niet verwijderd)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Index voor snelle filtering op niet-verwijderde projecten
CREATE INDEX IF NOT EXISTS idx_projects_deleted_at ON projects(deleted_at) WHERE deleted_at IS NULL;

-- Update RLS policies om deleted_at te respecteren
DROP POLICY IF EXISTS "projects_select_own" ON projects;
CREATE POLICY "projects_select_own" ON projects
  FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);
