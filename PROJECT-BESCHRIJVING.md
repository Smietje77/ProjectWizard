# ProjectWizard

## Wat is het?

Een AI-gestuurde webapp die niet-technische gebruikers stap voor stap begeleidt bij het opzetten van een nieuw softwareproject. Het eindresultaat is een kant-en-klare projectmap waarmee Claude Code direct aan de slag kan — zonder onduidelijkheden.

## Hoe werkt het?

- Gebruiker beschrijft een project-idee in vrije tekst
- AI stelt slimme vervolgvragen met advies en meerkeuze-opties
- Vragen worden aangestuurd door gespecialiseerde AI-agents (architect, frontend, backend, security, etc.)
- Een coordinator-agent bepaalt welke specialist aan zet is en bewaakt de voortgang
- Na elke ~3 vragen geeft een critic-agent feedback op de kwaliteit
- Bij 100% compleet genereert de app een downloadbare projectmap (ZIP)

## Wat zit er in de gegenereerde projectmap?

- `CLAUDE.md` — Projectcontext en instructies voor Claude Code
- `PROMPT.md` — Startprompt om direct te beginnen met bouwen
- `.mcp.json` — MCP server configuraties (Supabase, filesystem, etc.)
- `.env.example` — Benodigde API keys en omgevingsvariabelen
- `agents/` — Coordinator + specialist agents (frontend, backend, testing, devops, integration, security)
- `.claude/skills/` — Projectspecifieke skills per domein (design, backend, testing, deployment, integration, security)
- `.planning/` — GSD-compatibele planning met roadmap, requirements, fases en projectcontext
- `TEAM.md` — Overzicht van het AI-team en hun verantwoordelijkheden

## Onderdelen van de app

- **Wizard flow** — Stapsgewijze vraag-en-antwoord sessie met AI-begeleiding
- **Dashboard** — Overzicht van alle projecten met voortgangsindicatie
- **Live preview** — Real-time voorvertoning van de gegenereerde projectstructuur
- **Antwoord-geschiedenis** — Terug kunnen gaan, antwoorden bewerken, vragen overslaan
- **Document upload** — Bestaande documenten meegeven als context voor de AI
- **Screenshot analyse** — Screenshots uploaden die de AI analyseert voor design-keuzes
- **Skills 2.0** — Elke skill krijgt een categorie (capability_uplift of workflow) met retirement-metadata
- **Skill evals** — Automatisch gegenereerde testcases per skill
- **Meertalig** — Nederlands (primair) + Engels

## Specialist-agents in de wizard

- **Requirements** — Wat moet er gebouwd worden?
- **Architect** — Tech stack en structuur
- **Frontend** — UI/UX keuzes
- **Backend** — API en database
- **DevOps** — Hosting en deployment
- **Integration** — Externe services en MCP's
- **Testing** — Teststrategie
- **Security** — Compliance en beveiliging (conditioneel)

## Tech stack

- **Frontend**: SvelteKit (Svelte 5) + Tailwind CSS + Skeleton UI
- **AI**: Anthropic Claude API met Extended Thinking
- **Database**: Supabase (self-hosted)
- **Deployment**: Dokploy op eigen VPS
