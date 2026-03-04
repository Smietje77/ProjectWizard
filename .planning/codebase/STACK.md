# Technology Stack

**Analysis Date:** 2025-03-04

## Languages

**Primary:**
- TypeScript 5.9.3 - All application code, API endpoints, libraries, and type definitions
- JavaScript - Build configuration, package scripts

**Secondary:**
- HTML/SVG - Rendered through Svelte templates
- CSS - Tailwind CSS v4

## Runtime

**Environment:**
- Node.js - Application runtime (version not pinned in package.json, but typical LTS expected)

**Package Manager:**
- npm - Primary package manager
- Lockfile: present (package-lock.json not shown, but implied by standard npm workflow)

## Frameworks

**Core:**
- SvelteKit 2.50.1 - Full-stack web framework with file-based routing
- Svelte 5.48.2 - Component framework with runes system ($state, $derived, $effect)
- Vite 7.3.1 - Build tool and dev server

**UI/Styling:**
- Tailwind CSS 4.1.18 - Utility-first CSS framework via @tailwindcss/vite plugin
- Skeleton UI 4.11.0 (@skeletonlabs/skeleton) - Component library
- Skeleton Svelte 4.11.0 (@skeletonlabs/skeleton-svelte) - Svelte-specific component bindings

**Testing:**
- Vitest 4.0.18 - Unit test runner with Node environment
- jsdom 28.0.0 - DOM implementation for test environment

**Validation:**
- Zod 4.3.6 - TypeScript-first schema validation for request/response bodies

**Development Tools:**
- TypeScript 5.9.3 - Static type checking with strict mode enabled
- Svelte Check 4.3.5 - Compiler checks and type checking for Svelte files
- ESLint 9.39.2 - Code linting (configuration file not found in commit)
- Prettier 3.8.1 - Code formatter (no .prettierrc in root, uses defaults)

## Key Dependencies

**Critical:**
- @anthropic-ai/sdk 0.71.2 - Anthropic Claude API client for wizard conversation and document generation
- @supabase/supabase-js 2.93.1 - PostgreSQL database client and auth provider

**Infrastructure:**
- jszip 3.10.1 - Creates ZIP files for downloaded project bundles from browser and server

**Adapter:**
- @sveltejs/adapter-node 5.5.2 - Production Node.js server adapter (configured in svelte.config.js)
- @sveltejs/adapter-auto 7.0.0 - Auto-detection of target platform (fallback)
- @sveltejs/kit 2.50.1 - SvelteKit framework package

## Configuration

**Environment:**
- Variables loaded via `$env/dynamic/private` (SvelteKit's dynamic private environment)
- Required: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`
- Server-side only (private variables never sent to browser)

**Build:**
- `svelte.config.js` - SvelteKit configuration with Node adapter
- `vite.config.ts` - Vite build configuration with Tailwind CSS and SvelteKit plugins
  - Dev server port: 6776
  - Preview port: 6776
- `tsconfig.json` - TypeScript strict mode enabled, path aliases via SvelteKit
- `vitest.config.ts` - Test configuration with node environment and $lib path alias

**Type Checking:**
- `svelte-kit sync` (in prepare script) - Generates SvelteKit type definitions
- `svelte-check` - Validates Svelte components and TypeScript

## Development Workflow

**Scripts:**
```bash
npm run dev              # Start Vite dev server on :6776
npm run build           # Production build
npm run preview         # Preview production build
npm run check           # Type checking (svelte-kit sync + svelte-check)
npm run check:watch     # Watch mode for type checking
npm run test            # Run all unit tests
npm run test:watch      # Test watch mode
npm run test:coverage   # Generate coverage report
npm run lint            # Run ESLint
npm run format          # Format with Prettier
npm run prepare         # SvelteKit sync (auto-run on install)
```

**Hot Module Replacement:** Enabled (Vite default)
**Source Maps:** Enabled in development (sourceMap: true in tsconfig.json)

## Platform Requirements

**Development:**
- Node.js LTS (recommended, not pinned)
- npm 8+
- Modern browser with ES2020+ support

**Production:**
- Node.js server environment (via @sveltejs/adapter-node)
- Environment variables set at deploy time (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY)
- Deployment target: Dokploy on self-hosted VPS (port 6776 via vite.config.ts)

**Browser Support:**
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Android)
- Responsive CSS via Tailwind CSS

## Data Serialization

- JSON for API request/response bodies
- Base64 encoding for file uploads (documents, images)
- ZIP file generation via jszip for project bundle downloads

---

*Stack analysis: 2025-03-04*
