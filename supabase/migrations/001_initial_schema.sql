-- ProjectWizard: Initieel database schema
-- Voer dit uit via Supabase Dashboard > SQL Editor

-- Projecten (opgeslagen wizard sessies)
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  current_step INTEGER DEFAULT 0,
  answers JSONB DEFAULT '[]'::jsonb,
  generated_output JSONB,
  category_depth JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Templates (opgeslagen project templates)
CREATE TABLE IF NOT EXISTS templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  config JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Auto-update updated_at bij wijzigingen
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Row Level Security (open voor nu, later verfijnen met auth)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- Tijdelijke policies: volledige toegang (geen auth vereist voor MVP)
CREATE POLICY "projects_full_access" ON projects
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "templates_full_access" ON templates
  FOR ALL USING (true) WITH CHECK (true);
