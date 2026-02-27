// src/lib/generators/templates.ts
// Template functies voor project generatie — fallback wanneer AI-enrichment faalt
// Gebruikt door: zip-bundler.ts (direct), +server.ts (fallback)

import type { WizardAnswers } from '$lib/types/gsd';
import {
	COLOR_PALETTES,
	EFFECT_ARCHETYPES,
	FONT_PAIRINGS,
	SPECIAL_EFFECTS,
	ANIMATION_CLASSES
} from '$lib/data/design-tokens';

// ─── Utility ───────────────────────────────────────────────────────────────

/**
 * Sanitize JSON string — verwijder ongeldige karakters
 */
export function sanitizeJson(jsonStr: string): string {
  return jsonStr
    .replace(/[\u0000-\u001F\u007F]/g, '')  // Control characters
    .replace(/\t/g, '  ')                     // Tabs naar spaties
    .replace(/\r\n/g, '\n')                   // Windows line endings
    .replace(/\r/g, '\n');
}

// ─── Helper functies ───────────────────────────────────────────────────────

function frameworkName(fw: string): string {
  const map: Record<string, string> = {
    sveltekit: 'SvelteKit',
    nextjs: 'Next.js',
    nuxt: 'Nuxt 3'
  };
  return map[fw] || fw;
}

export function getFrameworkConventions(framework: string): string {
  const map: Record<string, string> = {
    'sveltekit': 'Svelte 5 runes syntax ($state, $derived, $effect)',
    'nextjs': 'React Server Components + App Router conventions',
    'nuxt': 'Vue 3 Composition API + Nuxt auto-imports'
  };
  return map[framework] || 'Modern framework conventions';
}

function dbName(db: string): string {
  const map: Record<string, string> = {
    supabase: 'Supabase (PostgreSQL)',
    postgresql: 'PostgreSQL',
    sqlite: 'SQLite'
  };
  return map[db] || db;
}

function authName(auth: string): string {
  const map: Record<string, string> = {
    'magic-link': 'Magic Link',
    'email-password': 'Email + Password',
    social: 'Social OAuth',
    none: 'Geen authenticatie'
  };
  return map[auth] || auth;
}

function uiLibName(lib: string): string {
  const map: Record<string, string> = {
    skeleton: 'Skeleton UI',
    shadcn: 'shadcn/ui',
    daisyui: 'DaisyUI',
    custom: 'Custom Components'
  };
  return map[lib] || lib;
}

function featuresList(answers: WizardAnswers): string {
  return answers.coreFeatures
    .map(f => `- **${f.name}** (${f.priority}): ${f.description}`)
    .join('\n');
}

function entitiesList(answers: WizardAnswers): string {
  if (answers.dataEntities.length === 0) return 'Nog geen data entiteiten gedefinieerd.';
  return answers.dataEntities
    .map(e => `- **${e.name}**: ${e.fields.join(', ')}${e.relations.length > 0 ? ` → relaties: ${e.relations.join(', ')}` : ''}`)
    .join('\n');
}

function servicesList(answers: WizardAnswers): string {
  if (answers.externalServices.length === 0) return 'Geen externe services.';
  return answers.externalServices
    .map(s => `- **${s.name}**: ${s.purpose}${s.mcp ? ` (MCP: ${s.mcp})` : ''}`)
    .join('\n');
}

// ─── Stripe Configuration Helper ──────────────────────────────────────────

interface StripeConfig {
  mode: 'test';
  apiVersion: string;
  events: string[];
  webhookEndpoint: string;
  projectType: 'ecommerce' | 'saas' | 'marketplace' | 'simple';
}

export function getStripeConfig(answers: WizardAnswers): StripeConfig | null {
  const hasStripe = answers.externalServices.some(s => s.name.toLowerCase().includes('stripe'));
  if (!hasStripe) return null;

  const text = `${answers.projectGoal} ${answers.problemDescription}`.toLowerCase();
  const isSvelteKit = answers.frontendFramework === 'sveltekit';

  const webhookEndpoint = isSvelteKit
    ? 'src/routes/api/webhooks/stripe/+server.ts'
    : answers.frontendFramework === 'nextjs'
      ? 'app/api/webhooks/stripe/route.ts'
      : 'server/api/webhooks/stripe.post.ts';

  const ecommerceKeywords = ['webshop', 'winkelwagen', 'bestelling', 'e-commerce', 'ecommerce', 'shop', 'winkel', 'product', 'order', 'cart', 'checkout'];
  const saasKeywords = ['abonnement', 'subscription', 'saas', 'plan', 'maandelijks', 'jaarlijks', 'monthly', 'yearly', 'recurring', 'membership', 'lidmaatschap'];
  const marketplaceKeywords = ['marketplace', 'platform', 'connect', 'vendor', 'seller', 'verkoper', 'commissie', 'payout'];

  if (marketplaceKeywords.some(k => text.includes(k))) {
    return {
      mode: 'test', apiVersion: '2025-12-18.acacia', projectType: 'marketplace', webhookEndpoint,
      events: ['account.updated', 'payment_intent.succeeded', 'payment_intent.payment_failed', 'transfer.created', 'payout.paid', 'payout.failed', 'checkout.session.completed', 'checkout.session.expired']
    };
  }

  if (saasKeywords.some(k => text.includes(k))) {
    return {
      mode: 'test', apiVersion: '2025-12-18.acacia', projectType: 'saas', webhookEndpoint,
      events: ['customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted', 'invoice.paid', 'invoice.payment_failed', 'checkout.session.completed', 'checkout.session.expired', 'customer.created']
    };
  }

  if (ecommerceKeywords.some(k => text.includes(k))) {
    return {
      mode: 'test', apiVersion: '2025-12-18.acacia', projectType: 'ecommerce', webhookEndpoint,
      events: ['checkout.session.completed', 'checkout.session.expired', 'payment_intent.succeeded', 'payment_intent.payment_failed', 'charge.refunded', 'charge.dispute.created', 'charge.dispute.closed']
    };
  }

  return {
    mode: 'test', apiVersion: '2025-12-18.acacia', projectType: 'simple', webhookEndpoint,
    events: ['payment_intent.succeeded', 'payment_intent.payment_failed', 'checkout.session.completed', 'checkout.session.expired', 'charge.refunded']
  };
}

function generateStripeSection(config: StripeConfig, isSvelteKit: boolean): string {
  const projectTypeLabels: Record<string, string> = {
    ecommerce: 'E-commerce (bestellingen & betalingen)',
    saas: 'SaaS (abonnementen & facturatie)',
    marketplace: 'Marketplace (Connect & payouts)',
    simple: 'Eenmalige betalingen'
  };

  const handlerImport = isSvelteKit
    ? `import Stripe from 'stripe';
import { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET } from '$env/static/private';
import { error, json } from '@sveltejs/kit';

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '${config.apiVersion}'
});

export async function POST({ request }) {
  const payload = await request.text();
  const sig = request.headers.get('stripe-signature');
  if (!sig) throw error(400, 'Missing stripe-signature header');

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    throw error(400, 'Invalid signature');
  }

  switch (event.type) {
${config.events.map(e => `    case '${e}':\n      // TODO: Implementeer ${e} handler\n      break;`).join('\n')}
    default:
      console.log(\`Unhandled event type: \${event.type}\`);
  }

  return json({ received: true });
}`
    : `import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '${config.apiVersion}'
});

export async function POST(request: Request) {
  const payload = await request.text();
  const sig = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return new Response('Invalid signature', { status: 400 });
  }

  switch (event.type) {
${config.events.map(e => `    case '${e}':\n      // TODO: Implementeer ${e} handler\n      break;`).join('\n')}
    default:
      console.log(\`Unhandled event type: \${event.type}\`);
  }

  return Response.json({ received: true });
}`;

  return `
## Stripe Integratie

### Project Type
${projectTypeLabels[config.projectType]}

### Setup (Test/Sandbox Mode)
1. Maak een account aan op https://dashboard.stripe.com/register
2. Gebruik **test mode** keys (beginnen met \`sk_test_\` en \`pk_test_\`)
3. API versie: \`${config.apiVersion}\`
4. Installeer de SDK: \`npm install stripe\`

> **Belangrijk**: Gebruik ALTIJD test mode keys tijdens ontwikkeling.
> Live keys (sk_live_) pas gebruiken na volledige testing in sandbox.

### Webhook Configuratie
1. Ga naar [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Klik **"Add endpoint"**
3. URL: \`https://{jouw-domain}/api/webhooks/stripe\`
4. API versie: \`${config.apiVersion}\`
5. Selecteer deze events:
${config.events.map(e => `   - \`${e}\``).join('\n')}

### Webhook Handler
\`\`\`typescript
// ${config.webhookEndpoint}
${handlerImport}
\`\`\`

### Lokaal Testen
\`\`\`bash
# Installeer Stripe CLI: https://stripe.com/docs/stripe-cli
stripe listen --forward-to localhost:5173/api/webhooks/stripe
# Kopieer het webhook signing secret (whsec_...) naar .env
\`\`\`
`;
}

// ─── CLAUDE.md Template ────────────────────────────────────────────────────

export function generateClaudeMdTemplate(answers: WizardAnswers): string {
  const screenshotSection = answers.screenshotAnalysis?.length
    ? `\n## Design Referenties\n\nDit project bevat screenshot-analyses als design referentie. Volg de design skill (.claude/skills/design.md) voor implementatie details.\n`
    : '';

  return `# ${answers.projectName}

## Projectbeschrijving

${answers.projectGoal}

**Probleemstelling:** ${answers.problemDescription}

**Doelgroep:** ${answers.targetUsers}

## Tech Stack

| Categorie | Keuze |
|-----------|-------|
| Framework | ${frameworkName(answers.frontendFramework)} |
| Database | ${dbName(answers.database)} |
| Authenticatie | ${authName(answers.authMethod)} |
| UI Library | ${uiLibName(answers.uiLibrary)} |
| Styling | ${answers.stylingApproach} |
| API Pattern | ${answers.apiPattern.toUpperCase()} |
| Navigatie | ${answers.navigationPattern} |
| Deployment | ${answers.deploymentTarget} |
| Tests | ${answers.testStrategy} |

## Kernfunctionaliteiten

${featuresList(answers)}

## Data Model

${entitiesList(answers)}

## Externe Services & Integraties

${servicesList(answers)}

## Out of Scope

${answers.outOfScope.length > 0 ? answers.outOfScope.map(s => `- ${s}`).join('\n') : 'Niet gedefinieerd.'}

## Deployment

- **Target:** ${answers.deploymentTarget}
${answers.hasDomain ? `- **Domein:** ${answers.domainName}` : '- Geen custom domein geconfigureerd'}

## MCP Servers

${answers.requiredMcps.length > 0 ? answers.requiredMcps.map(m => `- ${m}`).join('\n') : 'Geen MCP servers geconfigureerd.'}
${screenshotSection}
## Projectstructuur

Zie \`.planning/\` folder voor volledige GSD planning configuratie.
Zie \`TEAM.md\` voor agent team configuratie.
Zie \`agents/\` folder voor individuele agent instructies.
`;
}

// ─── PROMPT.md Template ────────────────────────────────────────────────────

export function generatePromptMdTemplate(answers: WizardAnswers): string {
  const framework = frameworkName(answers.frontendFramework);
  const db = dbName(answers.database);

  const mustFeatures = answers.coreFeatures.filter(f => f.priority === 'must');
  const shouldFeatures = answers.coreFeatures.filter(f => f.priority === 'should');

  return `# Build Instructies: ${answers.projectName}

## Fase 1: Project Setup

1. Initialiseer ${framework} project
2. Configureer ${answers.stylingApproach} met ${uiLibName(answers.uiLibrary)}
3. Setup ${db} connectie
${answers.authMethod !== 'none' ? `4. Implementeer ${authName(answers.authMethod)} authenticatie` : ''}

## Fase 2: Data Model

Maak de volgende entiteiten aan:

${answers.dataEntities.map(e => `### ${e.name}
- Velden: ${e.fields.join(', ')}
${e.relations.length > 0 ? `- Relaties: ${e.relations.join(', ')}` : ''}`).join('\n\n')}

${answers.database === 'supabase' ? `
### Supabase Setup
- Maak tabellen via Supabase Dashboard of migraties
- Configureer Row Level Security (RLS) voor alle tabellen
- Setup realtime subscriptions waar nodig
` : ''}

## Fase 3: Must-Have Features

${mustFeatures.map((f, i) => `${i + 1}. **${f.name}**: ${f.description}`).join('\n')}

## Fase 4: Should-Have Features

${shouldFeatures.map((f, i) => `${i + 1}. **${f.name}**: ${f.description}`).join('\n')}

## Fase 5: Integraties

${servicesList(answers)}

## Fase 6: Testing & Deployment

- Test strategie: ${answers.testStrategy}
${answers.criticalFlows.length > 0 ? `- Kritieke flows: ${answers.criticalFlows.join(', ')}` : ''}
- Deploy naar ${answers.deploymentTarget}
${answers.hasDomain ? `- Configureer domein: ${answers.domainName}` : ''}

## Conventies

- Gebruik ${answers.apiPattern.toUpperCase()} voor API communicatie
- Navigatie: ${answers.navigationPattern} layout
- TypeScript strict mode
- Elke component in eigen bestand
- Gebruik \`.planning/\` voor project tracking
`;
}

// ─── .env.example Template ─────────────────────────────────────────────────

export function generateEnvExampleTemplate(answers: WizardAnswers): string {
  const lines: string[] = [
    `# ${answers.projectName} — Environment Variables`,
    `# Kopieer naar .env en vul de waarden in`,
    ''
  ];

  // Database
  if (answers.database === 'supabase') {
    lines.push('# Supabase');
    lines.push('PUBLIC_SUPABASE_URL=https://your-project.supabase.co');
    lines.push('PUBLIC_SUPABASE_ANON_KEY=your-anon-key');
    lines.push('SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
    lines.push('');
  } else if (answers.database === 'postgresql') {
    lines.push('# PostgreSQL');
    lines.push('DATABASE_URL=postgresql://user:password@localhost:5432/dbname');
    lines.push('');
  } else if (answers.database === 'sqlite') {
    lines.push('# SQLite');
    lines.push('DATABASE_URL=file:./data/app.db');
    lines.push('');
  }

  // Auth
  if (answers.authMethod === 'social') {
    lines.push('# OAuth Providers');
    lines.push('GOOGLE_CLIENT_ID=');
    lines.push('GOOGLE_CLIENT_SECRET=');
    lines.push('GITHUB_CLIENT_ID=');
    lines.push('GITHUB_CLIENT_SECRET=');
    lines.push('');
  }

  // Stripe (special handling met sandbox info)
  const stripeConfig = getStripeConfig(answers);
  if (stripeConfig) {
    lines.push(`# Stripe (TEST MODE — gebruik sk_test_ keys!)`);
    lines.push(`# Dashboard: https://dashboard.stripe.com/test/apikeys`);
    lines.push(`# API versie: ${stripeConfig.apiVersion}`);
    lines.push('STRIPE_SECRET_KEY=sk_test_...');
    lines.push('STRIPE_PUBLISHABLE_KEY=pk_test_...');
    lines.push('STRIPE_WEBHOOK_SECRET=whsec_...');
    lines.push(`# Webhook events: ${stripeConfig.events.join(', ')}`);
    lines.push('');
  }

  // Other external services (excl. Stripe)
  for (const service of answers.externalServices) {
    if (service.name.toLowerCase().includes('stripe')) continue;
    lines.push(`# ${service.name}`);
    lines.push(`${service.name.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_API_KEY=`);
    lines.push('');
  }

  // Deployment
  if (answers.deploymentTarget === 'dokploy') {
    lines.push('# Dokploy');
    lines.push('DOKPLOY_URL=https://your-dokploy-instance.com');
    lines.push('');
  }

  // General
  lines.push('# Applicatie');
  if (answers.frontendFramework === 'sveltekit') {
    lines.push('PUBLIC_APP_URL=http://localhost:5173');
  } else if (answers.frontendFramework === 'nextjs') {
    lines.push('NEXT_PUBLIC_APP_URL=http://localhost:3000');
  } else {
    lines.push('NUXT_PUBLIC_APP_URL=http://localhost:3000');
  }
  lines.push('NODE_ENV=development');

  return lines.join('\n');
}

// ─── .mcp.json Template ───────────────────────────────────────────────────

export function generateMcpJsonTemplate(answers: WizardAnswers): string {
  const mcpServers: Record<string, { command: string; args: string[]; env?: Record<string, string> }> = {};

  for (const mcp of answers.requiredMcps) {
    const key = mcp.toLowerCase().replace(/[^a-z0-9]/g, '-');
    switch (mcp.toLowerCase()) {
      case 'supabase':
        mcpServers['supabase'] = {
          command: 'npx',
          args: ['-y', '@supabase/mcp-server'],
          env: {
            SUPABASE_URL: '${SUPABASE_URL}',
            SUPABASE_SERVICE_ROLE_KEY: '${SUPABASE_SERVICE_ROLE_KEY}'
          }
        };
        break;
      case 'filesystem':
        mcpServers['filesystem'] = {
          command: 'npx',
          args: ['-y', '@anthropic/mcp-filesystem', './']
        };
        break;
      case 'github':
        mcpServers['github'] = {
          command: 'npx',
          args: ['-y', '@anthropic/mcp-github'],
          env: {
            GITHUB_TOKEN: '${GITHUB_TOKEN}'
          }
        };
        break;
      case 'browser':
        mcpServers['browser'] = {
          command: 'npx',
          args: ['-y', '@anthropic/mcp-puppeteer']
        };
        break;
      default:
        mcpServers[key] = {
          command: 'npx',
          args: ['-y', `@${key}/mcp-server`]
        };
    }
  }

  const config = { mcpServers };
  return JSON.stringify(config, null, 2);
}

// ─── Coordinator Agent Template ────────────────────────────────────────────

export function generateCoordinatorAgentTemplate(answers: WizardAnswers): string {
  return `# Coordinator Agent — ${answers.projectName}

## Rol

Je bent de project coordinator voor **${answers.projectName}**. Je orkestreert het team van specialisten en bewaakt de voortgang.

## Project Context

- **Framework:** ${frameworkName(answers.frontendFramework)}
- **Database:** ${dbName(answers.database)}
- **Auth:** ${authName(answers.authMethod)}
- **Deployment:** ${answers.deploymentTarget}

## Team Overzicht

Zie \`TEAM.md\` voor het volledige team en hun spawn-instructies.

## Werkwijze

1. **Analyseer** de huidige taak en bepaal welke specialist(en) nodig zijn
2. **Delegeer** via de spawn-instructies in TEAM.md
3. **Review** het resultaat van elke specialist
4. **Integreer** de resultaten in het geheel
5. **Update** \`.planning/STATE.md\` na elke milestone

## Planning

Volg de fasering in \`.planning/ROADMAP.md\`:
${answers.coreFeatures.filter(f => f.priority === 'must').map((f, i) => `${i + 1}. ${f.name}`).join('\n')}

## Regels

- Eén specialist tegelijk per taak
- Altijd \`.planning/STATE.md\` updaten na voltooiing
- Bij twijfel: vraag de gebruiker
- Volg de GSD config in \`.planning/config.json\`
- Test elke feature voor je doorgaat naar de volgende
`;
}

// ─── Specialist Templates ──────────────────────────────────────────────────

export function getSpecialistTemplate(id: string, answers: WizardAnswers): string {
  const generators: Record<string, (a: WizardAnswers) => string> = {
    frontend: generateFrontendSpecialist,
    backend: generateBackendSpecialist,
    testing: generateTestingSpecialist,
    integration: generateIntegrationSpecialist,
    devops: generateDevopsSpecialist,
    security: generateSecuritySpecialist
  };

  const generator = generators[id];
  if (!generator) {
    return `# ${id} Specialist\n\nTemplate niet beschikbaar voor specialist type: ${id}`;
  }
  return generator(answers);
}

function generateFrontendSpecialist(answers: WizardAnswers): string {
  const fw = frameworkName(answers.frontendFramework);
  return `# Frontend Specialist — ${answers.projectName}

## Rol

Je bent de frontend developer. Je bouwt de UI met **${fw}** en **${uiLibName(answers.uiLibrary)}**.

## Tech Stack

- Framework: ${fw}
- UI Library: ${uiLibName(answers.uiLibrary)}
- Styling: ${answers.stylingApproach}
- Navigatie: ${answers.navigationPattern}
- Design: ${answers.designStyle}, ${answers.componentStyle} componenten
- Kleurschema: ${answers.colorScheme}

## Conventies

- TypeScript strict mode
- Componenten in eigen bestanden
- ${answers.frontendFramework === 'sveltekit' ? 'Gebruik $lib/ voor gedeelde code' : answers.frontendFramework === 'nextjs' ? 'Gebruik App Router met server components waar mogelijk' : 'Gebruik composables voor gedeelde logica'}
- Responsive design (mobile-first)
- Accessibility (WCAG 2.1 AA)

## Design Skill

Volg \`.claude/skills/design.md\` voor design tokens, kleuren en component styling.

## Taken

${answers.coreFeatures.filter(f => f.category === 'frontend' || f.category === 'auth').map(f => `- [ ] ${f.name}: ${f.description}`).join('\n') || '- [ ] Implementeer de UI componenten volgens ROADMAP.md'}
`;
}

function generateBackendSpecialist(answers: WizardAnswers): string {
  return `# Backend Specialist — ${answers.projectName}

## Rol

Je bent de backend developer. Je bouwt de API en database laag.

## Tech Stack

- Database: ${dbName(answers.database)}
- API Pattern: ${answers.apiPattern.toUpperCase()}
- Auth: ${authName(answers.authMethod)}
- Framework: ${frameworkName(answers.frontendFramework)} (${answers.frontendFramework === 'sveltekit' ? '+server.ts endpoints' : answers.frontendFramework === 'nextjs' ? 'API routes / server actions' : 'server/api/ endpoints'})

## Data Model

${entitiesList(answers)}

## Conventies

- Input validatie op alle endpoints
- Error handling met consistente response format
- ${answers.database === 'supabase' ? 'Row Level Security (RLS) voor alle tabellen' : 'Database migraties voor schema wijzigingen'}
- TypeScript types voor alle data entities
- Logging voor debugging

## Backend Skill

Volg \`.claude/skills/backend.md\` voor API conventies en database patterns.

## Taken

${answers.coreFeatures.filter(f => f.category === 'backend').map(f => `- [ ] ${f.name}: ${f.description}`).join('\n') || '- [ ] Implementeer API endpoints volgens data model'}
`;
}

function generateTestingSpecialist(answers: WizardAnswers): string {
  return `# Testing Specialist — ${answers.projectName}

## Rol

Je bent de test engineer. Je schrijft en onderhoud tests met strategie: **${answers.testStrategy}**.

## Test Framework

- ${answers.frontendFramework === 'sveltekit' ? 'Vitest + Playwright' : answers.frontendFramework === 'nextjs' ? 'Jest + Playwright' : 'Vitest + Playwright'}
- Strategie: ${answers.testStrategy}

## Kritieke Flows

${answers.criticalFlows.length > 0 ? answers.criticalFlows.map(f => `- ${f}`).join('\n') : '- Login/registratie flow\n- Kern business logica'}

## Conventies

- Unit tests voor utilities en business logica
- Integration tests voor API endpoints
- E2E tests voor kritieke user flows
- Minimum coverage: ${answers.testStrategy === 'comprehensive' ? '80%' : '60%'}

## Testing Skill

Volg \`.claude/skills/testing.md\` voor test patterns en best practices.
`;
}

function generateIntegrationSpecialist(answers: WizardAnswers): string {
  return `# Integration Specialist — ${answers.projectName}

## Rol

Je bent de integration specialist. Je verbindt externe services en configureert MCP servers.

## Externe Services

${servicesList(answers)}

## MCP Configuratie

${answers.requiredMcps.length > 0 ? answers.requiredMcps.map(m => `- ${m}`).join('\n') : 'Geen MCP servers.'}

Zie \`.mcp.json\` voor de volledige configuratie.

## Conventies

- Wrapper functies voor alle externe API calls
- Error handling met retry logica
- Rate limiting respecteren
- API keys in environment variables (nooit hardcoded)
- TypeScript types voor API responses

## Integration Skill

Volg \`.claude/skills/integration.md\` voor API client patterns.
`;
}

function generateDevopsSpecialist(answers: WizardAnswers): string {
  return `# DevOps Specialist — ${answers.projectName}

## Rol

Je bent de DevOps engineer. Je configureert deployment en infrastructure.

## Deployment

- Target: ${answers.deploymentTarget}
${answers.hasDomain ? `- Domein: ${answers.domainName}` : '- Geen custom domein'}

## Setup

${answers.deploymentTarget === 'dokploy' ? `### Dokploy
- Configureer Dockerfile of Nixpacks build
- Setup environment variables
- Configureer domein en SSL
${answers.hasDomain ? `- DNS configuratie voor ${answers.domainName}` : ''}` : answers.deploymentTarget === 'vercel' ? `### Vercel
- Configureer vercel.json indien nodig
- Setup environment variables in Vercel dashboard
${answers.hasDomain ? `- Configureer custom domein: ${answers.domainName}` : ''}` : `### Coolify
- Setup docker-compose of Nixpacks
- Configureer environment variables
${answers.hasDomain ? `- DNS configuratie voor ${answers.domainName}` : ''}`}

## Deployment Skill

Volg \`.claude/skills/deployment.md\` voor deployment best practices.
`;
}

function generateSecuritySpecialist(answers: WizardAnswers): string {
  // Detecteer compliance frameworks
  const text = [answers.projectGoal, answers.problemDescription, ...answers.coreFeatures.map(f => `${f.name} ${f.description}`), ...answers.outOfScope].join(' ').toLowerCase();
  const frameworks: string[] = [];
  if (text.includes('gdpr') || text.includes('privacy') || text.includes('avg')) frameworks.push('GDPR/AVG');
  if (text.includes('nis2')) frameworks.push('NIS2');
  if (text.includes('iso')) frameworks.push('ISO 27001');
  if (text.includes('hipaa')) frameworks.push('HIPAA');
  if (text.includes('soc2')) frameworks.push('SOC 2');

  return `# Security Specialist — ${answers.projectName}

## Rol

Je bent de security specialist. Je implementeert security best practices en compliance.

## Compliance Frameworks

${frameworks.length > 0 ? frameworks.map(f => `- ${f}`).join('\n') : '- Algemene security best practices'}

## Security Scope

- **Auth:** ${authName(answers.authMethod)}
- **Database:** ${dbName(answers.database)}
${answers.database === 'supabase' ? '- **RLS:** Row Level Security policies voor alle tabellen' : ''}
- **API:** ${answers.apiPattern.toUpperCase()} endpoints beveiligen

## Taken

- [ ] Security headers configureren (CSP, HSTS, X-Frame-Options)
- [ ] CORS configuratie
- [ ] Rate limiting implementeren
- [ ] Input validatie en sanitization
- [ ] Audit logging
${answers.database === 'supabase' ? '- [ ] RLS policies voor alle tabellen' : ''}
${answers.authMethod !== 'none' ? '- [ ] Auth flow security review' : ''}
${frameworks.includes('GDPR/AVG') ? '- [ ] GDPR compliance checklist' : ''}

## Security Skill

Volg \`.claude/skills/security.md\` voor security checklists en best practices.
`;
}

// ─── Skill Templates ───────────────────────────────────────────────────────

export function getSkillTemplate(id: string, answers: WizardAnswers): string {
  const generators: Record<string, (a: WizardAnswers) => string> = {
    design: generateDesignSkillTemplate,
    backend: generateBackendSkillTemplate,
    testing: generateTestingSkillTemplate,
    integration: generateIntegrationSkillTemplate,
    deployment: generateDeploymentSkillTemplate,
    security: generateSecuritySkillTemplate
  };

  const generator = generators[id];
  if (!generator) {
    return `# ${id} Skill\n\nSkill template niet beschikbaar voor: ${id}`;
  }
  return generator(answers);
}

// ─── Design Skill Template (ook standalone export) ─────────────────────────

export function generateDesignSkillTemplate(answers: WizardAnswers): string {
  const screenshotColors = (answers.screenshotAnalysis?.[0]?.analysis as Record<string, unknown> | undefined)
    ?.colors as Record<string, string> | undefined;
  const screenshotTypo = (answers.screenshotAnalysis?.[0]?.analysis as Record<string, unknown> | undefined)
    ?.typography as Record<string, string> | undefined;

  const confirmedEffects = answers.confirmedEffects;
  const isCustomNoScreenshot = answers.designStyle === 'custom' && !screenshotColors;

  // Kleurenpalet: screenshot heeft prioriteit, anders gecureerde fallback
  const palette = screenshotColors ?? COLOR_PALETTES[answers.designStyle] ?? COLOR_PALETTES['zakelijk'];
  const isDark = answers.colorScheme === 'dark';
  const bg = isDark ? (palette.darkBackground ?? palette.background) : palette.background;
  const surface = isDark ? (palette.darkSurface ?? palette.surface) : palette.surface;

  // Font pairing: screenshot fonts hebben prioriteit
  const fonts = FONT_PAIRINGS[answers.designStyle] ?? FONT_PAIRINGS['zakelijk'];
  const headingFont = screenshotTypo?.headingFont ?? fonts.heading;
  const bodyFont = screenshotTypo?.bodyFont ?? fonts.body;

  // Effect archetype op basis van componentStyle
  const effects = EFFECT_ARCHETYPES[answers.componentStyle] ?? EFFECT_ARCHETYPES['rounded'];

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
| Component Style | ${answers.componentStyle} |
| UI Library | ${uiLibName(answers.uiLibrary)} |

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

## Component Tailwind Classes (${answers.componentStyle})

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
