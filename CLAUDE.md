# ProjectWizard

## Project Overzicht
Een AI-gestuurde wizard webapp die niet-technische gebruikers begeleidt bij het opzetten van nieuwe software projecten. De wizard stelt slimme vragen, geeft advies, en genereert een complete projectmap met alle configuraties voor Claude Code.

## Doel
Zorgen dat Claude Code alle informatie heeft om een project succesvol te bouwen — zonder onduidelijkheden, met de juiste MCP's, agents, skills en een kant-en-klare prompt.

## Tech Stack
- **Frontend**: SvelteKit met Superforms
- **Database**: Supabase (self-hosted op VPS)
- **Styling**: Tailwind CSS + Skeleton UI
- **AI**: Anthropic Claude API + Google Gemini API (optioneel, voor design)
- **i18n**: Nederlands (primair) + Engels
- **Deployment**: Dokploy op VPS

## Bash Commands
```bash
npm install          # Installeer dependencies
npm run dev          # Start development server
npm run build        # Production build
npm run check        # TypeScript check
npm run test         # Unit tests (Vitest)
npm run test:e2e     # E2E tests (Playwright)
```

## Omgevingsvariabelen
Zie `.env.example` voor alle benodigde variabelen.
- `ANTHROPIC_API_KEY` — verplicht (coordinator, reasoning, JSON generatie)
- `GEMINI_API_KEY` — optioneel (design skill generatie, betere CSS/Tailwind output)

## Code Conventies
- TypeScript strict mode
- Svelte 5 runes syntax ($state, $derived, $effect)
- Nederlandse comments voor business logic
- Engelse code/variabelen
- Zod voor alle validatie schemas

## Project Generatie Output
- CLAUDE.md, PROMPT.md, PRODUCT-VISION.md (optioneel), STITCH-PROMPT.txt (optioneel)
- manifest.json, .mcp.json, .env.example, TEAM.md
- agents/ (coordinator + specialists), .claude/skills/, .planning/ (GSD)

## Voltooide Verbeteringen (Fase 1-5)
Code audit volledig afgerond (30/30 taken). Zie `.fixes/DEEP-ANALYSIS.md`.

## Huidige Prioriteit: Fase 6 — Product-Strategie + Stitch + Gemini

**Lees `.fixes/MASTER-PROMPT.md` voor de 7 taken (taak 31-37).**

1. Drie optionele bonus wizard-categorieën (merk, business, lancering)
2. Dynamische "3 suggesties" patroon (context-aware opties)
3. Product-strategische vragen in coordinator prompt
4. Answer mapper + generators voor nieuwe velden
5. PRODUCT-VISION.md generatie
6. STITCH-PROMPT.txt (Google Stitch UI-preview)
7. Gemini API multi-model: design generatie via Gemini, reasoning via Claude

## Methodologie
Zie `PROJECT-HARNESS.md` voor generatie-patronen en validatie-gates.
