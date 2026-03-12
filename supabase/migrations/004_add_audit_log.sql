-- ProjectWizard: Audit logging tabel
-- Voer dit uit via Supabase Dashboard > SQL Editor

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'generate', 'regenerate', 'edit_answer', 'complete'
  metadata JSONB,       -- { answer_count, enrichment_results, template_fallbacks }
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index voor snel opzoeken per user
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);

-- Index voor snel opzoeken per project
CREATE INDEX IF NOT EXISTS idx_audit_log_project_id ON audit_log(project_id);

-- RLS: gebruikers mogen alleen hun eigen logs zien/inserten
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_insert_own" ON audit_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "audit_log_select_own" ON audit_log
  FOR SELECT USING (auth.uid() = user_id);
