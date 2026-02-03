# ProjectWizard

## Project Overzicht
Een AI-gestuurde wizard webapp die niet-technische gebruikers begeleidt bij het opzetten van nieuwe software projecten. De wizard stelt slimme vragen, geeft advies, en genereert een complete projectmap met alle configuraties voor Claude Code.

## Doel
Zorgen dat Claude Code alle informatie heeft om een project succesvol te bouwen — zonder onduidelijkheden, met de juiste MCP's, agents, skills en een kant-en-klare prompt.

## Tech Stack
- **Frontend**: SvelteKit met Superforms
- **Database**: Supabase (self-hosted op VPS)
- **Styling**: Tailwind CSS + Skeleton UI
- **AI**: Anthropic Claude API (claude-sonnet-4-5-20250929)
- **i18n**: Nederlands (primair) + Engels
- **Deployment**: Dokploy op VPS

## Bash Commands
```bash
npm install          # Installeer dependencies
npm run dev          # Start development server (http://localhost:5173)
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # Run linter
npm run format       # Format code met Prettier
```

## Architectuur

### Frontend Structuur
```
src/
├── routes/
│   ├── +page.svelte              # Landing/start pagina
│   ├── +layout.svelte            # Hoofd layout met i18n
│   ├── wizard/
│   │   ├── +page.svelte          # Wizard hoofdpagina
│   │   ├── [step]/+page.svelte   # Dynamische stappen
│   │   └── preview/+page.svelte  # Live preview
│   └── api/
│       ├── chat/+server.ts       # Claude API endpoint
│       └── generate/+server.ts   # Project generatie endpoint
├── lib/
│   ├── components/               # UI componenten
│   ├── stores/                   # Svelte stores (wizard state)
│   ├── specialists/              # AI specialist configuraties
│   ├── i18n/                     # Vertalingen
│   └── utils/                    # Hulpfuncties
└── app.html
```

### Database Schema (Supabase)
```sql
-- Projecten (opgeslagen wizard sessies)
projects (
  id uuid PRIMARY KEY,
  name text,
  description text,
  current_step integer,
  answers jsonb,
  generated_output jsonb,
  created_at timestamp,
  updated_at timestamp
)

-- Templates (opgeslagen project templates)
templates (
  id uuid PRIMARY KEY,
  name text,
  description text,
  category text,
  config jsonb,
  created_at timestamp
)
```

## Code Conventies
- TypeScript strict mode
- Svelte 5 runes syntax ($state, $derived, $effect)
- Nederlandse comments voor business logic
- Engelse code/variabelen
- Zod voor alle validatie schemas

## Belangrijke Flows

### 1. Wizard Flow
1. Gebruiker typt vrije tekst idee
2. Coordinator agent analyseert en bepaalt eerste vraag
3. Per vraag: specialist geeft advies + multiple choice/vrije tekst
4. Antwoorden worden opgeslagen in Supabase
5. Live preview update na elk antwoord
6. Bij 100% compleet: genereer projectmap

### 2. Project Generatie
Output map bevat:
- CLAUDE.md (projectcontext)
- PROMPT.md (startprompt)
- .mcp.json (MCP configuraties)
- .env.example + .env.local (API keys)
- agents/ (coordinator + specialists)
- skills/ (benodigde skills)

## MCP Integraties
- **Supabase MCP**: Database queries en migraties
- **Filesystem**: Projectmap generatie
- **GitHub** (optioneel): Repository aanmaken

## Omgevingsvariabelen
Zie `.env.example` voor alle benodigde variabelen.
