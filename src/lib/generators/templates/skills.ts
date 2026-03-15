// src/lib/generators/templates/skills.ts
// Skill template generation (design, backend, testing, integration, deployment, security)

import type { WizardAnswers } from '$lib/types/gsd';
import {
  COLOR_PALETTES,
  EFFECT_ARCHETYPES,
  FONT_PAIRINGS,
  SPECIAL_EFFECTS,
  ANIMATION_CLASSES,
  UX_GUIDELINES,
  DESIGN_REASONING,
  INDUSTRY_PALETTES,
  UI_STYLES
} from '$lib/data/design-tokens';
import { getDesignPreset } from '$lib/data/design-presets';
import { dbName, authName, uiLibName, entitiesList, servicesList } from './utils';
import { getStripeConfig, generateStripeSection } from './stripe';

// ─── Skill Router ──────────────────────────────────────────────────────────

export function getSkillTemplate(id: string, answers: WizardAnswers): string {
  const generators: Record<string, (a: WizardAnswers) => string> = {
    design: generateDesignSkillTemplate,
    backend: generateBackendSkillTemplate,
    testing: generateTestingSkillTemplate,
    integration: generateIntegrationSkillTemplate,
    deployment: generateDeploymentSkillTemplate,
    security: generateSecuritySkillTemplate,
    seo: generateSeoSkillTemplate
  };

  const generator = generators[id];
  if (!generator) {
    return `# ${id} Skill\n\nSkill template niet beschikbaar voor: ${id}`;
  }
  return generator(answers);
}

// ─── Design Skill Template (ook standalone export) ─────────────────────────

export function generateDesignSkillTemplate(answers: WizardAnswers): string {
  // Design preset shortcut — gebruik exacte preset tokens
  if (answers.designPreset) {
    const preset = getDesignPreset(answers.designPreset);
    if (preset) {
      return generatePresetDesignSkill(answers, preset);
    }
  }

  const screenshotColors = (answers.screenshotAnalysis?.[0]?.analysis as Record<string, unknown> | undefined)
    ?.colors as Record<string, string> | undefined;
  const screenshotTypo = (answers.screenshotAnalysis?.[0]?.analysis as Record<string, unknown> | undefined)
    ?.typography as Record<string, string> | undefined;

  const confirmedEffects = answers.confirmedEffects;
  const isCustomNoScreenshot = answers.designStyle === 'custom' && !screenshotColors;

  // Kleurenpalet: screenshot > industry palette (specifiek) > design style (generiek) > zakelijk
  const industryPalette = answers.selectedPalette ? INDUSTRY_PALETTES[answers.selectedPalette] : undefined;
  const palette = screenshotColors ?? industryPalette ?? COLOR_PALETTES[answers.designStyle] ?? COLOR_PALETTES['zakelijk'];
  const isDark = answers.colorScheme === 'dark';
  let bg = isDark ? (palette.darkBackground ?? palette.background) : palette.background;
  let surface = isDark ? (palette.darkSurface ?? palette.surface) : palette.surface;

  // Cross-variabele correcties — sommige componentStyles vereisen een specifieke achtergrond
  let componentNote = '';
  if (!screenshotColors) {
    if (answers.componentStyle === 'glassmorphism') {
      // Glassmorphism heeft een donkere/gradiënt achtergrond nodig voor het frosted-glass effect.
      // Een witte achtergrond maakt de backdrop-blur onzichtbaar.
      bg = palette.darkBackground ?? '#0f172a';
      surface = 'rgba(255, 255, 255, 0.08)';
      componentNote = `> ℹ️ **Glassmorphism**: achtergrond is aangepast naar donker (${bg}).
> Voeg een gradient toe als achtergrond van de pagina:
> \`bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900\`
> De \`backdrop-blur\` effecten zijn alleen zichtbaar op een donkere/gekleurde ondergrond.`;
    } else if (answers.componentStyle === 'neumorphic') {
      // Neumorphic shadows zijn gekalibreerd op #e0e5ec (lichtgrijs-blauw).
      // Een afwijkende achtergrondkleur maakt de schaduwen onrealistisch.
      bg = '#e0e5ec';
      surface = '#e0e5ec';
      componentNote = `> ℹ️ **Neumorphism**: achtergrond is ingesteld op \`#e0e5ec\`.
> De shadow-waarden (\`#b8bec7\` donker, \`#ffffff\` licht) zijn hierop gekalibreerd.
> Pas accent/primary kleuren aan voor knoppen en highlights — niet de achtergrond.`;
    }
  }

  // Font pairing: screenshot fonts hebben prioriteit
  const fonts = FONT_PAIRINGS[answers.designStyle] ?? FONT_PAIRINGS['zakelijk'];
  const headingFont = screenshotTypo?.headingFont ?? fonts.heading;
  const bodyFont = screenshotTypo?.bodyFont ?? fonts.body;

  // Component classes: UI_STYLES (12 stijlen, specifiek) > EFFECT_ARCHETYPES (4, generiek) > rounded
  const uiStyle = answers.uiStyleDetail ? UI_STYLES[answers.uiStyleDetail] : undefined;
  const effects = uiStyle ?? EFFECT_ARCHETYPES[answers.componentStyle] ?? EFFECT_ARCHETYPES['rounded'];
  const effectStyleName = answers.uiStyleDetail ?? answers.componentStyle;

  // Special effects op basis van confirmedEffects
  const activeEffectSnippets: Array<{ name: string; snippet: string }> = [];
  if (confirmedEffects) {
    const allEffects = [
      ...confirmedEffects.confirmedEffects,
      ...confirmedEffects.addedEffects
    ];
    for (const effectName of allEffects) {
      const key = effectName.toLowerCase().replace(/\s+/g, '');
      const snippet = Object.entries(SPECIAL_EFFECTS).find(([k]) => key.includes(k))?.[1];
      if (snippet) {
        let code = '';
        if (snippet.tailwind) code = `\`${snippet.tailwind}\``;
        else if (snippet.wrapper) code = `wrapper: \`${snippet.wrapper}\`\ninner: \`${snippet.inner}\``;
        else if (snippet.css) code = `css: ${snippet.css.slice(0, 80)}...`;
        activeEffectSnippets.push({ name: snippet.name, snippet: code });
      }
    }
  }

  // WebsiteType → UX_GUIDELINES key mapping
  const uxKeyMap: Record<string, string> = {
    ecommerce: 'ecommerce',
    saas_b2b: 'saas',
    saas_consumer: 'saas',
    portfolio: 'portfolio',
    blog_content: 'blog',
    dashboard_admin: 'dashboard',
    marketplace: 'marketplace',
    community: 'community',
    landing: 'landing'
  };
  const uxKey = answers.websiteType ? uxKeyMap[answers.websiteType] : undefined;
  const uxGuidelines = uxKey ? UX_GUIDELINES[uxKey] : undefined;
  const designReasoning = answers.websiteType ? DESIGN_REASONING[answers.websiteType] : undefined;

  // Metadata voor tabel
  const paletteLabel = industryPalette?.label;
  const paletteMood = industryPalette?.mood;
  const styleMood = uiStyle?.mood;

  return `# Design Skill — ${answers.projectName}
${isCustomNoScreenshot ? `
> ⚠️ Custom stijl: geen screenshot of kleurkeuze aangeleverd.
> Pas de CSS custom properties hieronder handmatig aan op jouw merk.
` : ''}
## Design Systeem

| Eigenschap | Waarde |
|---|---|
| Stijl | ${answers.designStyle} |
| Kleurschema | ${answers.colorScheme} |
| Typography | ${answers.typography} |
| Component Style | ${effectStyleName} |
| UI Library | ${uiLibName(answers.uiLibrary)} |
${paletteLabel ? `| Kleurenpalet | ${paletteLabel} — ${paletteMood} |` : ''}
${styleMood ? `| UI Mood | ${styleMood} |` : ''}
${designReasoning?.darkModeDefault ? `| Dark Mode | Aanbevolen voor dit projecttype |` : ''}
${designReasoning ? `
---

## Design Strategie

> ${designReasoning.rationale}

**Aanbevolen combinatie voor dit projecttype:**
- **UI Stijlen:** ${designReasoning.recommendedStyles.join(', ')}
- **Kleurpaletten:** ${designReasoning.recommendedPalettes.join(', ')}
- **Fonts:** ${designReasoning.recommendedFonts.join(', ')}
` : ''}
---

## CSS Custom Properties

Voeg toe aan \`src/app.css\` of \`globals.css\`:

\`\`\`css
:root {
  --color-primary:    ${palette.primary};
  --color-secondary:  ${palette.secondary};
  --color-accent:     ${palette.accent};
  --color-background: ${bg};
  --color-surface:    ${surface};
  --color-text:       ${palette.text};
  --color-text-muted: ${palette.textMuted};
  --color-border:     ${palette.border};
}
\`\`\`

${componentNote ? `\n${componentNote}\n` : ''}
---

## Tailwind Config

Voeg toe aan \`tailwind.config.js\` → \`theme.extend\`:

\`\`\`js
colors: {
  primary:    'var(--color-primary)',
  secondary:  'var(--color-secondary)',
  accent:     'var(--color-accent)',
  background: 'var(--color-background)',
  surface:    'var(--color-surface)',
  foreground: 'var(--color-text)',
  muted:      'var(--color-text-muted)',
  border:     'var(--color-border)',
},
${fonts.tailwindConfig}
\`\`\`

---

## Component Tailwind Classes (${effectStyleName})

\`\`\`
card:   ${effects.card}
button: ${effects.button}
${effects.input ? `input:  ${effects.input}` : ''}${effects.badge ? `\nbadge:  ${effects.badge}` : ''}${effects.overlay ? `\noverlay: ${effects.overlay}` : ''}
\`\`\`

- **Spacing:** 4px/8px grid systeem (Tailwind \`p-2\`, \`p-4\`, \`gap-4\`, \`gap-8\`)
- **Transitions:** \`transition-all duration-200\` voor hover, \`duration-300\` voor state changes

---

## Typografie

| Rol | Font | Tailwind klasse |
|---|---|---|
| Koppen | ${headingFont} | \`font-display\` |
| Broodtekst | ${bodyFont} | \`font-sans\` |
| Code | ${fonts.mono} | \`font-mono\` |

### Typografie-schaal

\`\`\`
h1: text-4xl font-bold tracking-tight
h2: text-3xl font-semibold
h3: text-2xl font-semibold
h4: text-xl font-medium
body: text-base leading-relaxed
small: text-sm text-muted
\`\`\`
${screenshotColors ? `
> Fonts gedetecteerd via screenshot analyse.` : ''}
---

## Animaties

### Entry/Exit (tailwindcss-animate)
\`\`\`
Enter: ${ANIMATION_CLASSES.enter.slice(0, 4).join('  ')}
Exit:  ${ANIMATION_CLASSES.exit.slice(0, 4).join('  ')}
\`\`\`

### Loop & Feedback
\`\`\`
${ANIMATION_CLASSES.loop.join('  ')}
\`\`\`

### Extended (tailwindcss-animated plugin)
\`\`\`
${ANIMATION_CLASSES.extended.slice(0, 5).join('  ')}
\`\`\`

Modifier classes: \`${ANIMATION_CLASSES.duration.slice(1, 4).join(' ')}\` · \`${ANIMATION_CLASSES.easing.join(' ')}\` · \`${ANIMATION_CLASSES.delay.slice(0, 3).join(' ')}\`
${activeEffectSnippets.length > 0 ? `
---

## Special Effects

${activeEffectSnippets.map(e => `### ${e.name}\n\`\`\`\n${e.snippet}\n\`\`\``).join('\n\n')}
` : ''}${confirmedEffects && confirmedEffects.removedEffects.length > 0 ? `
### Verwijderde effecten (gebruik NIET)

${confirmedEffects.removedEffects.map(e => `- ~~${e}~~`).join('\n')}
` : ''}${confirmedEffects && confirmedEffects.animationPreferences.length > 0 ? `
### Animatievoorkeuren

${confirmedEffects.animationPreferences.map(e => `- ${e}`).join('\n')}
` : ''}
---

## Quick Start

1. **Fonts laden** — voeg toe aan \`<head>\` in \`app.html\` of layout:
   \`\`\`html
   <link rel="preconnect" href="https://fonts.googleapis.com">
   <link href="${fonts.googleFontsUrl}" rel="stylesheet">
   \`\`\`

2. **CSS variabelen** — plak het \`:root { ... }\` blok bovenaan \`src/app.css\`

3. **Tailwind config** — voeg het \`theme.extend\` blok toe aan \`tailwind.config.js\`

Daarna kun je direct Tailwind-classes als \`text-primary\`, \`bg-surface\`, \`border-border\` gebruiken.
${uxGuidelines ? `
---

## Layout & UX Principes

### Regels
${uxGuidelines.rules.map(r => `- ${r}`).join('\n')}

### Vermijd (anti-patterns)
${uxGuidelines.antiPatterns.map(a => `- ❌ ${a}`).join('\n')}

### Kleurgebruik
${uxGuidelines.colorRule}

### Layout
${uxGuidelines.layoutTip}
` : ''}
`;
}

// ─── Design Preset Helper ─────────────────────────────────────────────────

function generatePresetDesignSkill(answers: WizardAnswers, preset: import('$lib/data/design-presets').DesignPreset): string {
  const componentClasses = preset.style.componentStyle === 'glassmorphism'
    ? `card:   backdrop-blur-xl bg-white/5 border border-white/10 rounded-[${preset.style.borderRadius}] shadow-[${preset.style.shadow}]
button: backdrop-blur-sm bg-primary/90 hover:bg-primary text-black font-medium rounded-[${preset.style.borderRadius}] px-6 py-2.5 transition-all
input:  bg-white/5 border border-white/10 rounded-[${preset.style.borderRadius}] backdrop-blur-sm focus:border-primary/50 focus:ring-1 focus:ring-primary/30`
    : `card:   bg-surface border border-border rounded-[${preset.style.borderRadius}] shadow-[${preset.style.shadow}]
button: bg-primary hover:bg-primary/90 text-white font-medium rounded-[${preset.style.borderRadius}] px-6 py-2.5 transition-colors
input:  bg-background border border-border rounded-[${preset.style.borderRadius}] focus:border-primary focus:ring-1 focus:ring-primary/30`;

  return `# Design Skill — ${answers.projectName}

> Design Preset: **${preset.name}** — ${preset.description}

## Design Systeem

| Eigenschap | Waarde |
|---|---|
| Preset | ${preset.name} |
| Theme | ${preset.theme} |
| Component Style | ${preset.style.componentStyle} |
| Heading Font | ${preset.fonts.heading} |
| Body Font | ${preset.fonts.body} |
| UI Library | ${uiLibName(answers.uiLibrary)} |

---

## CSS Custom Properties

Voeg toe aan \`src/app.css\` of \`globals.css\`:

\`\`\`css
${preset.cssVariables}
\`\`\`
${preset.style.componentStyle === 'glassmorphism' ? `
> **Glassmorphism**: voeg een gradient achtergrond toe aan de pagina:
> \`bg-gradient-to-br from-[#0a0a0a] via-[#1a1a2e] to-[#0a0a0a]\`
> De \`backdrop-blur\` effecten zijn alleen zichtbaar op een donkere/gekleurde ondergrond.
` : ''}
---

## Tailwind Config

Voeg toe aan \`tailwind.config.js\` → \`theme.extend\`:

\`\`\`js
${preset.tailwindExtend}
\`\`\`

---

## Component Tailwind Classes (${preset.style.componentStyle})

\`\`\`
${componentClasses}
\`\`\`

- **Spacing:** 4px/8px grid systeem (Tailwind \`p-2\`, \`p-4\`, \`gap-4\`, \`gap-8\`)
- **Transitions:** \`transition-all duration-200\` voor hover, \`duration-300\` voor state changes

---

## Typografie

| Rol | Font | Tailwind klasse |
|---|---|---|
| Koppen | ${preset.fonts.heading} | \`font-display\` |
| Broodtekst | ${preset.fonts.body} | \`font-sans\` |
| Code | ${preset.fonts.mono} | \`font-mono\` |

### Typografie-schaal

\`\`\`
h1: text-4xl font-bold tracking-tight
h2: text-3xl font-semibold
h3: text-2xl font-semibold
h4: text-xl font-medium
body: text-base leading-relaxed
small: text-sm text-muted
\`\`\`

---

## Quick Start

1. **Fonts laden** — voeg toe aan \`<head>\` in \`app.html\` of layout:
   \`\`\`html
   <link rel="preconnect" href="https://fonts.googleapis.com">
   <link href="${preset.fonts.googleFontsUrl}" rel="stylesheet">
   \`\`\`

2. **CSS variabelen** — plak het \`:root { ... }\` blok bovenaan \`src/app.css\`

3. **Tailwind config** — voeg het \`theme.extend\` blok toe aan \`tailwind.config.js\`

Daarna kun je direct Tailwind-classes als \`text-primary\`, \`bg-surface\`, \`border-border\` gebruiken.
`;
}

// ─── Backend Skill Template ────────────────────────────────────────────────

export function generateBackendSkillTemplate(answers: WizardAnswers): string {
  return `# Backend Skill — ${answers.projectName}

## API Conventies

- Pattern: ${answers.apiPattern.toUpperCase()}
- ${answers.frontendFramework === 'sveltekit' ? 'Endpoints in +server.ts bestanden' : answers.frontendFramework === 'nextjs' ? 'API routes in app/api/ of server actions' : 'Server routes in server/api/'}
- Consistente error response format: \`{ error: string, code: number }\`
- Input validatie met Zod schemas

## Database Patterns

- Database: ${dbName(answers.database)}
${answers.database === 'supabase' ? `- Gebruik Supabase client voor queries
- RLS policies voor data isolatie
- Realtime subscriptions waar zinvol
- Database functies voor complexe logica` : `- Gebruik migraties voor schema wijzigingen
- Connection pooling configureren
- Prepared statements voor alle queries`}

## Data Entiteiten

${entitiesList(answers)}

## Best Practices

- TypeScript types voor alle request/response schemas
- Error boundaries met logging
- Pagination voor lijsten (limit/offset of cursor-based)
- Caching strategie waar relevant
- Input sanitization tegen injection attacks
`;
}

// ─── Testing Skill Template ────────────────────────────────────────────────

export function generateTestingSkillTemplate(answers: WizardAnswers): string {
  return `# Testing Skill — ${answers.projectName}

## Test Strategie: ${answers.testStrategy}

## Frameworks

- Unit/Integration: ${answers.frontendFramework === 'nextjs' ? 'Jest' : 'Vitest'}
- E2E: Playwright
- Coverage target: ${answers.testStrategy === 'comprehensive' ? '80%+' : answers.testStrategy === 'standard' ? '60%+' : '40%+'}

## Test Patronen

### Unit Tests
- Test pure functies en utilities
- Mock externe dependencies
- Test edge cases en error scenarios
- Bestandsnaam: \`*.test.ts\` naast het bronbestand

### Integration Tests
- Test API endpoints met echte database (test DB)
- Test auth flows end-to-end
- Valideer data integriteit

### E2E Tests (Playwright)
- Test kritieke user flows
- Cross-browser testing
- Screenshot regression testing

## Kritieke Flows om te Testen

${answers.criticalFlows.length > 0 ? answers.criticalFlows.map(f => `- ${f}`).join('\n') : '- Login/registratie\n- Kern business logica\n- Data CRUD operaties'}

## Commands

\`\`\`bash
# Unit/Integration tests
${answers.frontendFramework === 'nextjs' ? 'npm test' : 'npm run test'}

# E2E tests
npx playwright test

# Coverage rapport
${answers.frontendFramework === 'nextjs' ? 'npm test -- --coverage' : 'npm run test -- --coverage'}
\`\`\`
`;
}

// ─── Integration Skill Template ────────────────────────────────────────────

export function generateIntegrationSkillTemplate(answers: WizardAnswers): string {
  const stripeConfig = getStripeConfig(answers);
  const isSvelteKit = answers.frontendFramework === 'sveltekit';
  const stripeSection = stripeConfig ? generateStripeSection(stripeConfig, isSvelteKit) : '';

  return `# Integration Skill — ${answers.projectName}

## Externe Services

${servicesList(answers)}
${stripeSection}

## API Client Patronen

### Wrapper Functie Template

\`\`\`typescript
// lib/services/[service-name].ts
class ServiceClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = process.env.SERVICE_URL!;
    this.apiKey = process.env.SERVICE_API_KEY!;
  }

  async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(\`\${this.baseUrl}\${endpoint}\`, {
      ...options,
      headers: {
        'Authorization': \`Bearer \${this.apiKey}\`,
        'Content-Type': 'application/json',
        ...options?.headers
      }
    });

    if (!response.ok) {
      throw new ServiceError(response.status, await response.text());
    }

    return response.json();
  }
}
\`\`\`

### Error Handling

- Retry met exponential backoff (max 3 pogingen)
- Circuit breaker voor herhaalde failures
- Graceful degradation waar mogelijk
- Logging van alle externe calls

### Rate Limiting

- Respecteer rate limits van externe APIs
- Implementeer request queuing indien nodig
- Cache responses waar mogelijk

## MCP Server Configuratie

Zie \`.mcp.json\` voor de complete MCP configuratie.
${answers.requiredMcps.length > 0 ? answers.requiredMcps.map(m => `- **${m}**: Configuratie in .mcp.json`).join('\n') : ''}
`;
}

// ─── Deployment Skill Template ─────────────────────────────────────────────

export function generateDeploymentSkillTemplate(answers: WizardAnswers): string {
  return `# Deployment Skill — ${answers.projectName}

## Deployment Target: ${answers.deploymentTarget}

${answers.deploymentTarget === 'dokploy' ? `## Dokploy Setup

### Vereisten
- VPS met Dokploy geïnstalleerd
- Docker beschikbaar op de server
- DNS geconfigureerd${answers.hasDomain ? ` voor ${answers.domainName}` : ''}

### Stappen
1. Maak nieuw project in Dokploy dashboard
2. Koppel GitHub repository
3. Configureer environment variables
4. ${answers.hasDomain ? `Configureer domein: ${answers.domainName}` : 'Gebruik Dokploy auto-generated URL'}
5. Enable auto-deploy op push naar main

### Dockerfile
\`\`\`dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/build ./build
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev
EXPOSE 3000
CMD ["node", "build"]
\`\`\`
` : answers.deploymentTarget === 'vercel' ? `## Vercel Setup

### Stappen
1. Import project in Vercel
2. Configureer environment variables
3. ${answers.hasDomain ? `Configureer custom domein: ${answers.domainName}` : 'Gebruik Vercel auto-generated URL'}
4. Enable auto-deploy op push naar main

### vercel.json (optioneel)
\`\`\`json
{
  "framework": "${answers.frontendFramework}",
  "buildCommand": "npm run build",
  "outputDirectory": "${answers.frontendFramework === 'sveltekit' ? '.svelte-kit' : answers.frontendFramework === 'nextjs' ? '.next' : '.output'}"
}
\`\`\`
` : `## Coolify Setup

### Stappen
1. Maak nieuw project in Coolify
2. Koppel GitHub repository
3. Kies Nixpacks of Docker build
4. Configureer environment variables
5. ${answers.hasDomain ? `Configureer domein: ${answers.domainName}` : 'Gebruik auto-generated URL'}
`}

## Environment Configuratie

Zie \`.env.example\` voor alle benodigde environment variables.
Zorg dat alle vars in het deployment platform geconfigureerd zijn.

## Best Practices

- Nooit secrets in code committen
- Gebruik environment variables voor alle configuratie
- Setup staging environment voor testen
- Monitoring en logging configureren
- Backup strategie voor database
`;
}

// ─── Security Skill Template ───────────────────────────────────────────────

export function generateSecuritySkillTemplate(answers: WizardAnswers): string {
  const text = [answers.projectGoal, answers.problemDescription, ...answers.coreFeatures.map(f => `${f.name} ${f.description}`), ...answers.outOfScope].join(' ').toLowerCase();
  const hasGDPR = text.includes('gdpr') || text.includes('privacy') || text.includes('avg');
  const hasNIS2 = text.includes('nis2');

  return `# Security Skill — ${answers.projectName}

## Security Checklist

### Headers
- [ ] Content-Security-Policy (CSP)
- [ ] Strict-Transport-Security (HSTS)
- [ ] X-Content-Type-Options: nosniff
- [ ] X-Frame-Options: DENY
- [ ] Referrer-Policy: strict-origin-when-cross-origin
- [ ] Permissions-Policy

### CORS
- [ ] Configureer allowed origins (geen wildcard in productie)
- [ ] Beperk allowed methods
- [ ] Configureer allowed headers

### Rate Limiting
- [ ] API endpoints rate limiten
- [ ] Login pogingen beperken
- [ ] Brute force bescherming

### Input Validatie
- [ ] Server-side validatie op alle endpoints
- [ ] SQL injection preventie
- [ ] XSS preventie
- [ ] CSRF tokens

### Authenticatie
${answers.authMethod !== 'none' ? `- [ ] Secure session management
- [ ] Token expiration configureren
- [ ] Password hashing (bcrypt/argon2)
- [ ] Account lockout na failed attempts` : '- Geen authenticatie geconfigureerd'}

### Database Security
${answers.database === 'supabase' ? `- [ ] RLS policies voor alle tabellen
- [ ] Service role key alleen server-side
- [ ] Anon key permissions minimaliseren
- [ ] Database functies voor gevoelige operaties` : `- [ ] Prepared statements gebruiken
- [ ] Database user met minimale rechten
- [ ] Connection string beveiligen`}

### Audit Logging
- [ ] Log alle auth events
- [ ] Log data modificaties
- [ ] Log admin acties
- [ ] Centraliseer logs

${hasGDPR ? `## GDPR/AVG Compliance

- [ ] Privacy policy pagina
- [ ] Cookie consent banner
- [ ] Data export functionaliteit
- [ ] Account verwijdering (recht op vergetelheid)
- [ ] Data minimalisatie principe
- [ ] Verwerkingsregister documenteren
- [ ] Data Processing Agreement (DPA) met providers
` : ''}

${hasNIS2 ? `## NIS2 Compliance

- [ ] Incident response plan
- [ ] Supply chain security review
- [ ] Risk assessment documentatie
- [ ] Security awareness procedures
- [ ] Meldplicht bij incidenten (24 uur)
- [ ] Business continuity plan
` : ''}

## Tools

- **Security scanning:** npm audit, Snyk
- **SAST:** ESLint security plugin
- **Headers check:** securityheaders.com
- **SSL check:** ssllabs.com
`;
}

// ─── SEO Skill Template ─────────────────────────────────────────────────

export function generateSeoSkillTemplate(answers: WizardAnswers): string {
  const fw = answers.frontendFramework;
  const websiteType = answers.websiteType ?? 'landing';

  // Schema types per websiteType
  const schemaMap: Record<string, string[]> = {
    ecommerce: ['Product', 'Offer', 'AggregateRating', 'BreadcrumbList', 'Organization'],
    marketplace: ['Product', 'Offer', 'AggregateRating', 'BreadcrumbList', 'Organization'],
    blog_content: ['Article', 'BlogPosting', 'BreadcrumbList', 'Organization', 'Person'],
    portfolio: ['Person', 'CreativeWork', 'BreadcrumbList', 'Organization'],
    landing: ['Organization', 'WebSite', 'BreadcrumbList', 'FAQPage'],
    community: ['Organization', 'WebSite', 'BreadcrumbList', 'DiscussionForumPosting']
  };
  const schemas = schemaMap[websiteType] ?? schemaMap['landing'];

  // Framework-specifieke head management
  const frameworkHead = fw === 'sveltekit'
    ? `### SvelteKit

\`\`\`svelte
<!-- +page.svelte -->
<svelte:head>
  <title>{pageTitle} — ${answers.projectName}</title>
  <meta name="description" content={pageDescription} />
  <link rel="canonical" href={canonicalUrl} />
  <meta property="og:title" content={pageTitle} />
  <meta property="og:description" content={pageDescription} />
  <meta property="og:url" content={canonicalUrl} />
  <meta property="og:image" content={ogImage} />
  <meta name="twitter:card" content="summary_large_image" />
</svelte:head>
\`\`\`

- Gebruik \`+page.ts\` load functies voor dynamische meta data
- Overweeg \`prerender = true\` voor statische pagina's
- Sitemap via \`+server.ts\` in \`/sitemap.xml\` route`
    : fw === 'nextjs'
    ? `### Next.js

\`\`\`typescript
// app/page.tsx
export const metadata: Metadata = {
  title: 'Paginatitel — ${answers.projectName}',
  description: 'Pagina beschrijving',
  openGraph: {
    title: 'Paginatitel',
    description: 'Beschrijving',
    url: 'https://example.com/pagina',
    images: ['/og-image.png'],
  },
};

// Dynamisch:
export async function generateMetadata({ params }): Promise<Metadata> { ... }
\`\`\`

- Gebruik \`generateStaticParams\` voor statische pagina's
- Sitemap via \`app/sitemap.ts\` export`
    : `### Nuxt

\`\`\`typescript
// pages/index.vue
useHead({
  title: 'Paginatitel — ${answers.projectName}',
  meta: [
    { name: 'description', content: 'Pagina beschrijving' },
  ],
});

useSeoMeta({
  ogTitle: 'Paginatitel',
  ogDescription: 'Beschrijving',
  ogImage: '/og-image.png',
  twitterCard: 'summary_large_image',
});
\`\`\`

- Gebruik \`definePageMeta\` voor route-level configuratie
- Sitemap via \`@nuxtjs/sitemap\` module`;

  return `# SEO Skill — ${answers.projectName}

## Website Type: ${websiteType}

---

## On-Page SEO Checklist

### Title Tags
- Uniek per pagina, max 60 karakters
- Format: \`{Paginatitel} — ${answers.projectName}\`
- Primair keyword vooraan

### Meta Description
- Uniek per pagina, max 155 karakters
- Bevat primair keyword en call-to-action
- Beschrijft de pagina-inhoud duidelijk

### Headings
- Eén \`<h1>\` per pagina (bevat primair keyword)
- Logische hiërarchie: h1 → h2 → h3
- Geen heading levels overslaan

### Afbeeldingen
- Alt-tekst op alle \`<img>\` tags (beschrijvend, met keyword waar relevant)
- Lazy loading: \`loading="lazy"\` op afbeeldingen below the fold
- WebP/AVIF formaat met \`<picture>\` fallback
- Compressed: max 200KB per afbeelding

### URL Structuur
- Korte, beschrijvende slugs: \`/producten/handgemaakte-ring\`
- Geen underscores, geen hoofdletters
- Geen diepte > 3 niveaus waar mogelijk

---

## Structured Data (JSON-LD)

### Verplichte Schema Types

${schemas.map(s => `- \`${s}\``).join('\n')}

### Implementatie

\`\`\`html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "${schemas[0]}",
  "name": "${answers.projectName}",
  "url": "https://example.com"
}
</script>
\`\`\`

${websiteType === 'ecommerce' || websiteType === 'marketplace' ? `### Product Schema (verplicht voor producten)

\`\`\`json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Productnaam",
  "description": "Beschrijving",
  "image": "https://example.com/product.webp",
  "offers": {
    "@type": "Offer",
    "price": "29.95",
    "priceCurrency": "EUR",
    "availability": "https://schema.org/InStock"
  }
}
\`\`\`` : websiteType === 'blog_content' ? `### Article Schema (verplicht voor artikelen)

\`\`\`json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Artikel titel",
  "author": { "@type": "Person", "name": "Auteur" },
  "datePublished": "2025-01-01",
  "image": "https://example.com/header.webp"
}
\`\`\`` : `### Organization Schema

\`\`\`json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "${answers.projectName}",
  "url": "https://example.com",
  "logo": "https://example.com/logo.png"
}
\`\`\``}

Valideer met: https://search.google.com/test/rich-results

---

## Technical SEO

### sitemap.xml
- Genereer automatisch vanuit routes
- Includer alleen canonieke, indexeerbare pagina's
- Update \`<lastmod>\` bij content wijzigingen
- Submit via Google Search Console

### robots.txt
\`\`\`
User-agent: *
Allow: /
Disallow: /api/
Disallow: /login
Sitemap: https://example.com/sitemap.xml
\`\`\`

### Canonical URLs
- Elke pagina heeft een \`<link rel="canonical">\`
- Voorkom duplicate content (www vs non-www, trailing slashes)
- Canonicals zijn altijd absolute URLs

### Open Graph + Twitter Cards
- \`og:title\`, \`og:description\`, \`og:image\`, \`og:url\` op elke pagina
- \`og:image\`: minimaal 1200x630px
- \`twitter:card\`: \`summary_large_image\`
- Test met: https://developers.facebook.com/tools/debug/

---

## Core Web Vitals

| Metric | Target | Wat het meet |
|---|---|---|
| LCP | < 2.5s | Laadtijd grootste element |
| FID/INP | < 100ms | Interactiviteit |
| CLS | < 0.1 | Visuele stabiliteit |

### Optimalisatie Tips
- **LCP**: Preload hero images, gebruik \`fetchpriority="high"\`, optimaliseer server response
- **FID/INP**: Minimaliseer JavaScript, gebruik web workers voor zware taken
- **CLS**: Stel afmetingen in op \`<img>\`/\`<video>\`, vermijd dynamic content insertion above the fold

---

## Framework-specifieke SEO

${frameworkHead}

---

## SEO Monitoring

- **Google Search Console**: indexering, performance, errors
- **Lighthouse**: audits voor performance, accessibility, SEO
- **PageSpeed Insights**: Core Web Vitals meting
- Schema validatie: rich results test
`;
}
