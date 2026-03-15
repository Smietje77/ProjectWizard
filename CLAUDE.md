# ProjectWizard

## Project Overzicht
Een AI-gestuurde wizard webapp die niet-technische gebruikers begeleidt bij het opzetten van nieuwe software projecten. De wizard stelt slimme vragen, geeft advies, en genereert een complete projectmap met alle configuraties voor Claude Code.

## Tech Stack
- **Frontend**: SvelteKit + Tailwind CSS + Skeleton UI
- **Database**: Supabase (self-hosted op VPS)
- **AI Tekst**: Anthropic Claude API (coordinator, reasoning, JSON)
- **AI Design**: Google Gemini 2.5 Flash (design skills, CSS/Tailwind)
- **AI Images**: Google Nano Banana 2 / Gemini 3.1 Flash Image (mockups, OG images, favicons)
- **Code Review**: CodeRabbit (gratis voor public repos)
- **Deployment**: Dokploy op VPS

## Omgevingsvariabelen
- `ANTHROPIC_API_KEY` — verplicht
- `GEMINI_API_KEY` — optioneel (design skills + image assets via Nano Banana 2)

## Project Generatie Output
CLAUDE.md, PROMPT.md, PRODUCT-VISION.md, STITCH-PROMPT.txt, manifest.json, .mcp.json,
.env.example, TEAM.md, .coderabbit.yaml, agents/, .claude/skills/ (incl. SEO),
.planning/ (GSD), assets/ (mockup.png, og-image.png, favicon.png — optioneel)

## Voltooide Verbeteringen (Fase 1-5)
Code audit volledig afgerond (30/30 taken). Zie `.fixes/DEEP-ANALYSIS.md`.

## Huidige Prioriteit: Fase 6 (10 taken, taak 31-40)

**Lees `.fixes/MASTER-PROMPT.md`** — Taken 31-39 afgerond.

1. ✅ Bonus wizard-categorieën (merk, business, lancering)
2. ✅ Dynamische "3 suggesties" patroon
3. ✅ Product-strategische vragen in coordinator
4. ✅ Answer mapper + generators nieuwe velden
5. ✅ PRODUCT-VISION.md generatie
6. ✅ STITCH-PROMPT.txt (Google Stitch UI-preview)
7. ✅ Gemini API multi-model (tekst)
8. ✅ SEO specialist + skill generatie (223 tests)
9. ✅ Design presets (VoltFlow, Clean Pro, Warm Craft)
10. ⬜ Nano Banana 2 assets + CodeRabbit config generatie

## Methodologie
Zie `PROJECT-HARNESS.md` voor generatie-patronen en validatie-gates.
