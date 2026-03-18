# ProjectWizard

## Project Overzicht
AI-gestuurde wizard webapp voor niet-technische gebruikers. Genereert complete project scaffolds voor Claude Code.

## Tech Stack
SvelteKit + Tailwind/Skeleton UI, Supabase, Claude API, Gemini 2.5 Flash + Nano Banana 2, CodeRabbit

## Omgevingsvariabelen
`ANTHROPIC_API_KEY` (verplicht), `GEMINI_API_KEY` (optioneel)

## Huidige Prioriteit: Taak 42 — Superpowers-Compatible Output

**Lees `.fixes/MASTER-PROMPT.md`** — 5 stappen.

Maakt gegenereerde skills compatibel met de Superpowers Claude Code plugin:
1. YAML frontmatter op alle skill templates
2. Skill paden: .claude/skills/{naam}/SKILL.md
3. Superpowers installatie-instructie in PROMPT.md
4. using-superpowers intro skill per project
5. Tests updaten

## Methodologie
Zie `PROJECT-HARNESS.md` voor generatie-patronen en validatie-gates.
