# ProjectWizard — Startprompt voor Claude Code

## Status van dit project
**Dit is een NIEUW project dat vanaf nul moet worden opgezet.**
- Er is nog geen `src/` map of `package.json`
- De projectmap bevat alleen configuratie en documentatie
- Jij gaat de SvelteKit applicatie bouwen

## Omgeving is KLAAR
- **Supabase**: Self-hosted instance draait al ✅
  - URL en keys staan in `.env.local`
  - Je kunt direct queries uitvoeren
- **Anthropic API**: Key staat in `.env.local` ✅
- **Projectmap**: `C:\claude_projects\ProjectWizard`

## Instructie
**Begin direct met Fase 1.** Het ontwerp en plan staan in `CLAUDE.md` en de `agents/` en `skills/` mappen. Deze hoef je niet te bespreken — ga bouwen.

---

## Wat is dit project?
ProjectWizard is een AI-gestuurde wizard webapp die niet-technische gebruikers helpt bij het opzetten van nieuwe software projecten. Het eindresultaat is een complete projectmap met alle configuraties voor Claude Code.

## Fase 1: Project Setup (START HIER)
1. Initialiseer SvelteKit in de HUIDIGE map:
   ```bash
   npm create svelte@latest . -- --template skeleton --types typescript --prettier --eslint
   ```
2. Installeer dependencies:
   ```bash
   npm install @supabase/supabase-js @anthropic-ai/sdk zod
   npm install -D tailwindcss postcss autoprefixer
   npm install @skeletonlabs/skeleton @skeletonlabs/tw-plugin
   npx tailwindcss init -p
   ```
3. Configureer Tailwind en Skeleton UI
4. Maak Supabase client in `src/lib/supabase.ts`
5. Test dat alles werkt met `npm run dev`

## Fase 2: Database Setup
Maak de Supabase tabellen aan via SQL:
```sql
-- Projecten (opgeslagen wizard sessies)
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  current_step INTEGER DEFAULT 0,
  answers JSONB DEFAULT '[]'::jsonb,
  generated_output JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Templates (opgeslagen project templates)
CREATE TABLE templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  config JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security (optioneel voor nu)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
```

## Fase 3: Core Components
Bouw de wizard interface in `src/lib/components/`:
1. **WizardShell.svelte** - Hoofd layout met stappen-indicator
2. **QuestionCard.svelte** - Vraag weergave met advies
3. **AnswerInput.svelte** - Mix van vrije tekst en multiple choice
4. **LivePreview.svelte** - Real-time prompt preview
5. **ProgressTracker.svelte** - Voortgang door de vragen

## Fase 4: AI Integratie
1. API endpoint voor Claude: `src/routes/api/chat/+server.ts`
2. Laad de juiste specialist agent uit `agents/specialists/`
3. Streaming responses voor betere UX

## Fase 5: Project Generatie
1. API endpoint: `src/routes/api/generate/+server.ts`
2. Verzamel alle antwoorden uit Supabase
3. Genereer projectmap naar `C:\claude_projects\{projectnaam}\`
4. Maak alle config files aan (CLAUDE.md, PROMPT.md, etc.)

---

## Belangrijke Requirements
- **Max 50 vragen** per wizard sessie
- **Altijd wedervraag optie** ("Ik heb een vraag") bij elke vraag
- **Advies met uitleg** bij elke vraag
- **Nederlands als hoofdtaal**, Engels als optie
- **Tussendoor opslaan** moet mogelijk zijn (via Supabase)
- **.env guided invullen** met links naar dashboards

## De Specialists (zie `agents/` map)
Lees deze bestanden om te begrijpen hoe elke specialist werkt:
- `agents/coordinator.md` - Bepaalt welke specialist aan zet is
- `agents/specialists/*.md` - Individuele specialisten

## Skills (zie `skills/` map)
- `skills/wizard-flow.md` - Hoe de vragenflow werkt
- `skills/prompt-generator.md` - Hoe output gegenereerd wordt
- `skills/env-helper.md` - Hoe .env invullen werkt

## Kwaliteitscriteria
- [ ] Gebruiker kan idee in vrije tekst invoeren
- [ ] Vragen zijn mix van multiple choice en vrije tekst
- [ ] Elke vraag heeft advies met uitleg
- [ ] Live preview groeit mee met antwoorden
- [ ] Project kan tussendoor opgeslagen worden
- [ ] .env kan guided ingevuld worden
- [ ] Output is complete projectmap
- [ ] Interface is in het Nederlands

---

## NU ACTIE
Start met Fase 1, stap 1: `npm create svelte@latest . -- --template skeleton --types typescript --prettier --eslint`
