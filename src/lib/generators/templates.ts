// src/lib/generators/templates.ts
// Shared template generators — gebruikt door zip-bundler.ts EN als fallback voor SSE/JSON paden

import type { WizardAnswers, DataEntity, PageScreenshot, ScreenshotAnalysis, ImagePlaceholder } from '$lib/types/gsd';
import { getActiveSpecialists } from './specialist-detection';

// ============================================
// Helpers
// ============================================

export function sanitizeJson(content: string): string {
  let clean = content.trim();
  if (clean.startsWith('```')) {
    clean = clean.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  try {
    JSON.parse(clean);
  } catch {
    console.warn('Invalid JSON content detected in sanitizeJson, returning as-is');
  }
  return clean;
}

export function getFrameworkConventions(framework: string): string {
  const map: Record<string, string> = {
    'sveltekit': 'Svelte 5 runes syntax ($state, $derived, $effect)',
    'nextjs': 'React Server Components + App Router conventions',
    'nuxt': 'Vue 3 Composition API + Nuxt auto-imports'
  };
  return map[framework] || 'Modern framework conventions';
}

export function generateSchemaSQL(entities: DataEntity[], database: string): string {
  if (database !== 'supabase' && database !== 'postgresql') {
    return '-- Schema wordt gegenereerd door het framework';
  }

  return entities.map(entity => {
    const tableName = entity.name.toLowerCase();
    const fieldLines = entity.fields.map(f => {
      if (f === 'id') return '  id UUID DEFAULT gen_random_uuid() PRIMARY KEY';
      if (f.endsWith('_id')) {
        const refTable = f.replace('_id', 's');
        return `  ${f} UUID REFERENCES ${refTable}(id)`;
      }
      if (f.endsWith('_at') || f.endsWith('_time')) return `  ${f} TIMESTAMPTZ DEFAULT NOW()`;
      if (f === 'email') return '  email TEXT UNIQUE NOT NULL';
      if (f === 'price' || f === 'total' || f === 'score') return `  ${f} DECIMAL(10,2) NOT NULL DEFAULT 0`;
      if (f === 'published') return '  published BOOLEAN DEFAULT FALSE';
      if (f === 'status') return "  status TEXT DEFAULT 'draft'";
      if (f === 'role') return "  role TEXT DEFAULT 'user'";
      if (f === 'slug') return '  slug TEXT UNIQUE';
      if (f === 'code') return '  code TEXT NOT NULL';
      if (f === 'language') return '  language TEXT';
      if (f === 'target_type') return '  target_type TEXT NOT NULL';
      return `  ${f} TEXT`;
    }).join(',\n');
    return `CREATE TABLE ${tableName} (\n${fieldLines}\n);`;
  }).join('\n\n');
}

// Type guard: nieuw uitgebreid analyse-formaat (FIX 13)
function isNewAnalysisFormat(analysis: unknown): analysis is ScreenshotAnalysis {
  return typeof analysis === 'object' && analysis !== null
    && 'effects' in analysis && 'imagery' in analysis && 'mood' in analysis;
}

// Extraheer concrete design tokens uit screenshot analyses (FIX 6 + 13)
function extractDesignTokens(screenshots: PageScreenshot[]): {
  cssVars: string;
  tailwindExtend: string;
  fonts: string[];
  summaries: Array<{ label: string; summary: string }>;
} {
  if (!screenshots || screenshots.length === 0) {
    return { cssVars: '', tailwindExtend: '', fonts: [], summaries: [] };
  }

  const tailwindColors: Record<string, string> = {};
  const fonts: string[] = [];
  const cssLines: string[] = [];
  const summaries: Array<{ label: string; summary: string }> = [];

  for (const screenshot of screenshots) {
    const a = screenshot.analysis as Record<string, unknown>;

    if (isNewAnalysisFormat(a)) {
      // Nieuw formaat: gestructureerde kleuren
      for (const [name, value] of Object.entries(a.colors)) {
        if (typeof value === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(value)) {
          const safeName = name.replace(/([A-Z])/g, '-$1').toLowerCase();
          cssLines.push(`  --color-${safeName}: ${value};`);
          tailwindColors[safeName] = value;
        }
      }
      // Fonts
      if (a.typography.headingFont) fonts.push(a.typography.headingFont);
      if (a.typography.bodyFont) fonts.push(a.typography.bodyFont);
      // Samenvatting
      summaries.push({
        label: screenshot.label,
        summary: `${a.mood.overall} | ${a.layout.navigation} nav | ${a.mood.contrast} contrast | ${a.mood.temperature}`
      });
    } else {
      // Oud formaat: generieke key-zoektocht
      const colors = (a.kleuren || a.colors || a.kleurenpalet || a.color_palette) as Record<string, unknown> | undefined;
      if (colors && typeof colors === 'object') {
        for (const [name, value] of Object.entries(colors)) {
          if (typeof value === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(value)) {
            const safeName = name.replace(/\s+/g, '-').toLowerCase();
            cssLines.push(`  --color-${safeName}: ${value};`);
            tailwindColors[safeName] = value;
          }
        }
      }

      const typo = (a.typografie || a.typography || a.fonts) as Record<string, unknown> | undefined;
      if (typo && typeof typo === 'object') {
        const fontFields = ['aanbevolen_fonts', 'headingFont', 'bodyFont', 'heading_font', 'body_font', 'fonts'];
        for (const field of fontFields) {
          const val = typo[field];
          if (typeof val === 'string' && val.length > 1) fonts.push(val);
          if (Array.isArray(val)) fonts.push(...val.filter((v): v is string => typeof v === 'string'));
        }
      }

      const stijl = (a.stijl || a.style || a.design_stijl) as string | undefined;
      const layout = (a.layout || a.structuur) as string | undefined;
      const parts: string[] = [];
      if (stijl) parts.push(`Stijl: ${typeof stijl === 'string' ? stijl : JSON.stringify(stijl)}`);
      if (layout) parts.push(`Layout: ${typeof layout === 'string' ? layout : JSON.stringify(layout)}`);
      if (colors) parts.push(`Kleuren: ${Object.entries(colors).filter(([,v]) => typeof v === 'string').map(([k,v]) => `${k}: ${v}`).join(', ')}`);
      summaries.push({
        label: screenshot.label,
        summary: parts.length > 0 ? parts.join(' | ') : 'Zie originele analyse voor details'
      });
    }
  }

  const cssVars = cssLines.length > 0
    ? `:root {\n${cssLines.join('\n')}\n}`
    : '';

  const tailwindExtend = Object.keys(tailwindColors).length > 0
    ? `colors: ${JSON.stringify(tailwindColors, null, 6)}`
    : '';

  return {
    cssVars,
    tailwindExtend,
    fonts: [...new Set(fonts)],
    summaries
  };
}

// Genereer layout sectie uit nieuw formaat analyse
function formatLayoutSection(analysis: ScreenshotAnalysis): string {
  const l = analysis.layout;
  return `## Layout Structuur
- **Navigatie**: ${l.navigation} (${l.navigationStyle})
- **Hero**: ${l.heroType}
- **Content breedte**: ${l.contentWidth}
- **Grid patroon**: ${l.gridPattern}
- **Footer**: ${l.footerStyle}
- **Sectie-overgangen**: ${l.sectionDividers}
`;
}

// Genereer effecten sectie met Tailwind classes
function formatEffectsSection(analysis: ScreenshotAnalysis, confirmedEffects: string[]): string {
  const effects = analysis.effects;
  const lines: string[] = ['## Visuele Effecten\n'];

  if (confirmedEffects.length === 0) {
    lines.push('_Geen effecten bevestigd door gebruiker._\n');
    return lines.join('\n');
  }

  const effectMap: Record<string, string> = {
    'glassmorphism': '`backdrop-blur-md bg-white/10 border border-white/20`',
    'neumorphism': '`shadow-[8px_8px_16px_#d1d1d1,-8px_-8px_16px_#ffffff]`',
    'gradients': effects.gradients.used
      ? `\`bg-gradient-to-b\` — ${effects.gradients.description}`
      : '`bg-gradient-to-b from-primary to-secondary`',
    'schaduwen': effects.shadows !== 'none'
      ? `\`shadow-${effects.shadows === 'dramatic' ? '2xl' : effects.shadows === 'elevated' ? 'xl' : 'md'}\``
      : '`shadow-md`',
    'glow': '`shadow-[0_0_20px_rgba(var(--color-primary),0.4)]`',
    'blur': '`backdrop-blur-sm`',
    'overlays': effects.overlays !== 'none' ? `\`${effects.overlays}\` overlay` : '',
    'gradient-border': '`border border-transparent bg-clip-padding` met gradient achtergrond',
    'grain-texture': 'CSS `filter: url(#grain)` of SVG noise texture'
  };

  for (const effect of confirmedEffects) {
    const lower = effect.toLowerCase();
    const matchedKey = Object.keys(effectMap).find(k => lower.includes(k));
    if (matchedKey && effectMap[matchedKey]) {
      lines.push(`- **${effect}**: ${effectMap[matchedKey]}`);
    } else {
      lines.push(`- **${effect}**`);
    }
  }
  lines.push('');
  return lines.join('\n');
}

// Genereer animatie sectie
function formatAnimationsSection(animationHints: string[], animationPreferences: string[]): string {
  const allAnimations = [...animationHints, ...animationPreferences].filter(a => a.length > 0);
  if (allAnimations.length === 0) return '';

  return `## Animaties
${allAnimations.map(a => `- ${a}`).join('\n')}

**Timing richtlijnen:**
- Subtiele hover/focus: 150-250ms ease-out
- Micro-interacties: 200-400ms ease-in-out
- Hero/page transitions: 600-800ms cubic-bezier
- Skeleton loaders: 1.5-2s pulse/wave
`;
}

// Genereer image placeholders sectie
function formatPlaceholdersSection(placeholders: ImagePlaceholder[]): string {
  if (placeholders.length === 0) return '';

  const items = placeholders.map(p => {
    return `### ${p.location}
- **Type**: ${p.type} | **Vorm**: ${p.shape} | **Behandeling**: ${p.treatment}
\`\`\`html
<!-- PLACEHOLDER: ${p.location} (${p.suggestedSize}, ${p.shape}) -->
<div class="bg-muted rounded-xl flex items-center justify-center" style="aspect-ratio: ${parsePlaceholderRatio(p.suggestedSize)}">
  <span class="text-muted-foreground">Afbeelding toevoegen</span>
</div>
\`\`\``;
  }).join('\n\n');

  return `## Image Placeholders\n\n${items}\n`;
}

function parsePlaceholderRatio(size: string): string {
  const match = size.match(/(\d+)\s*x\s*(\d+)/);
  if (match) return `${match[1]}/${match[2]}`;
  return '16/9';
}

// Genereer patronen sectie
function formatPatternsSection(patterns: ScreenshotAnalysis['patterns']): string {
  if (patterns.decorativeElements === 'none' && patterns.backgroundPatterns === 'none') return '';

  return `## Decoratieve Patronen
- **Decoratieve elementen**: ${patterns.decorativeElements}
- **Achtergrond patronen**: ${patterns.backgroundPatterns}
- **Witruimte**: ${patterns.whitespace}
- **Ritme**: ${patterns.rhythm}
`;
}

// Genereer sfeer sectie
function formatMoodSection(mood: ScreenshotAnalysis['mood']): string {
  return `## Sfeer & Richtlijnen
- **Overall**: ${mood.overall}
- **Contrast**: ${mood.contrast}
- **Dichtheid**: ${mood.density}
- **Temperatuur**: ${mood.temperature}
`;
}

// ============================================
// CLAUDE.md Template
// ============================================

export function generateClaudeMdTemplate(answers: WizardAnswers): string {
  const schemaSection = answers.dataEntities.length > 0
    ? `\n## Database Schema\n\`\`\`sql\n${generateSchemaSQL(answers.dataEntities, answers.database)}\n\`\`\`\n`
    : '';

  // FIX 12: Design systeem cross-referentie
  const designSection = answers.designStyle
    ? `\n## Design Systeem\nVisueel ontwerp en design tokens staan in \`.claude/skills/design.md\`.\nRaadpleeg deze skill voor kleuren, typografie, component stijlen en layout patronen.\n`
    : '';

  return `# ${answers.projectName}

## Project Overzicht
${answers.projectGoal}

## Doel
${answers.problemDescription}

## Tech Stack
- **Frontend**: ${answers.frontendFramework}
- **Database**: ${answers.database}
- **Styling**: ${answers.stylingApproach} + ${answers.uiLibrary}
- **Auth**: ${answers.authMethod}
- **Deployment**: ${answers.deploymentTarget}

## Bash Commands
\`\`\`bash
npm install          # Installeer dependencies
npm run dev          # Start development server
npm run build        # Production build
npm run preview      # Preview production build
\`\`\`
${schemaSection}
## GSD Workflow
Dit project gebruikt het GSD framework. Zie \`.planning/\` voor:
- PROJECT.md - Visie en scope
- REQUIREMENTS.md - Alle requirements met IDs
- ROADMAP.md - Gefaseerd implementatieplan
- config.json - GSD configuratie

Start met: \`/gsd:progress\`
${designSection}
## Code Conventies
- TypeScript strict mode
- ${getFrameworkConventions(answers.frontendFramework)}
- Nederlandse comments voor business logic
- Engelse code/variabelen
`;
}

// ============================================
// PROMPT.md Template
// ============================================

export function generatePromptMdTemplate(answers: WizardAnswers): string {
  return `# ${answers.projectName} - Startprompt voor Claude Code

## Status
**Dit is een NIEUW project met GSD workflow.**

## GSD Framework
Dit project heeft een complete \`.planning/\` folder. Gebruik:
- \`/gsd:progress\` - Bekijk voortgang
- \`/gsd:discuss-phase 1\` - Bespreek fase 1
- \`/gsd:plan-phase 1\` - Plan fase 1
- \`/gsd:execute-phase 1\` - Voer fase 1 uit
- \`/gsd:verify-work 1\` - Verifieer fase 1

## Wat te bouwen
${answers.projectGoal}

## Requirements
Zie \`.planning/REQUIREMENTS.md\` voor alle requirements met IDs.

## Implementatie Fasen
Zie \`.planning/ROADMAP.md\` voor het volledige plan met alle fases en deliverables.
Gebruik EXACT dezelfde fases als in ROADMAP.md.

## Nu starten
1. Review de \`.planning/\` folder
2. Run \`/gsd:progress\`
3. Begin met Phase 1

## Tech Stack (al besloten)
- ${answers.frontendFramework}
- ${answers.database}
- ${answers.uiLibrary} + ${answers.stylingApproach}
- Deploy via ${answers.deploymentTarget}
`;
}

// ============================================
// .env.example Template
// ============================================

export function generateEnvExampleTemplate(answers: WizardAnswers): string {
  let env = `# ${answers.projectName} Environment Variables\n\n`;

  if (answers.database === 'supabase') {
    env += `# Supabase
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
`;
  }

  if (answers.requiredMcps.some(m => m.includes('anthropic'))) {
    env += `\n# Anthropic
ANTHROPIC_API_KEY=sk-ant-...
`;
  }

  if (answers.externalServices.some(s => s.name.toLowerCase().includes('stripe'))) {
    env += `\n# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
`;
  }

  return env;
}

// ============================================
// .mcp.json Template (FIX 2)
// ============================================

export function generateMcpJsonTemplate(answers: WizardAnswers): string {
  const mcps: Record<string, { command: string; args: string[]; env: Record<string, string> }> = {};

  // Filesystem is altijd nodig
  mcps['filesystem'] = {
    command: 'npx',
    args: ['-y', '@anthropic/mcp-filesystem'],
    env: {
      ALLOWED_PATHS: '${PROJECT_ROOT}'
    }
  };

  // Supabase
  if (answers.requiredMcps.includes('supabase') || answers.database === 'supabase') {
    mcps['supabase'] = {
      command: 'npx',
      args: ['-y', '@supabase/mcp-server'],
      env: {
        SUPABASE_URL: '${SUPABASE_URL}',
        SUPABASE_SERVICE_ROLE_KEY: '${SUPABASE_SERVICE_ROLE_KEY}'
      }
    };
  }

  // GitHub
  if (answers.requiredMcps.includes('github')) {
    mcps['github'] = {
      command: 'npx',
      args: ['-y', '@anthropic/mcp-github'],
      env: {
        GITHUB_PERSONAL_ACCESS_TOKEN: '${GITHUB_PERSONAL_ACCESS_TOKEN}'
      }
    };
  }

  // Externe services met MCP
  for (const service of answers.externalServices) {
    if (service.mcp && !mcps[service.mcp]) {
      mcps[service.mcp] = {
        command: 'npx',
        args: ['-y', `@${service.mcp}/mcp-server`],
        env: {}
      };
    }
  }

  return JSON.stringify({ mcpServers: mcps }, null, 2) + '\n';
}

// ============================================
// Agent Templates (FIX 9: gecontextualiseerd)
// ============================================

export function generateCoordinatorAgentTemplate(answers: WizardAnswers): string {
  return `# Coordinator Agent - ${answers.projectName}

## Rol
Hoofd-coördinator die de GSD workflow begeleidt.

## Context
- **Project**: ${answers.projectName}
- **Tech Stack**: ${answers.frontendFramework} + ${answers.database}
- **User Level**: ${answers.techLevel}

## GSD Integratie
Volg de requirements in \`.planning/REQUIREMENTS.md\`.
Track voortgang in \`.planning/STATE.md\`.
Raadpleeg \`CLAUDE.md\` voor tech stack beslissingen.

## Specialist Delegatie
- Backend: Database en API werk
- Frontend: UI componenten en styling
- Design: Zie \`.claude/skills/design.md\` voor visuele richtlijnen
`;
}

export function getSpecialistTemplate(id: string, answers: WizardAnswers): string {
  const commonRefs = `
## Referenties
- \`.planning/REQUIREMENTS.md\` — Requirements en acceptatiecriteria
- \`CLAUDE.md\` — Tech stack en code conventies`;

  switch (id) {
    case 'frontend':
      return `# Frontend Specialist

## Rol
UI/UX specialist voor interface werk met ${answers.frontendFramework} en ${answers.uiLibrary}.

## Context
- **Framework**: ${answers.frontendFramework} met ${getFrameworkConventions(answers.frontendFramework)}
- **UI Library**: ${answers.uiLibrary}
- **Navigatie**: ${answers.navigationPattern}
- **Component stijl**: ${answers.componentStyle}

## Focus
- Componenten bouwen met ${answers.uiLibrary}
- ${answers.navigationPattern} navigatie implementeren
- Responsive design (mobile-first)
- Forms met client-side validatie
- Loading skeletons en error states
${commonRefs}
- \`.claude/skills/design.md\` — Design tokens, kleuren, typografie
`;
    case 'backend':
      return `# Backend Specialist

## Rol
Backend developer voor API en database werk met ${answers.database}.

## Context
- **Database**: ${answers.database}
- **API Pattern**: ${answers.apiPattern.toUpperCase()}
- **Auth**: ${answers.authMethod}
- **Entities**: ${answers.dataEntities.map(e => e.name).join(', ') || 'zie requirements'}

## Focus
- Database schema's en migraties
- ${answers.apiPattern.toUpperCase()} API endpoints
- Zod validatie en input sanitization
- Error handling met user-friendly responses
${answers.database === 'supabase' ? '- Row Level Security (RLS) policies\n' : ''}${commonRefs}
`;
    case 'testing':
      return `# Test Specialist

## Rol
Test engineer voor ${answers.testStrategy} test coverage.

## Context
- **Strategie**: ${answers.testStrategy}
- **Framework**: ${answers.frontendFramework}
- **Kritieke flows**: ${answers.criticalFlows.join(', ') || 'zie requirements'}

## Focus
- Unit tests (Vitest) voor business logic
- Integration tests voor API endpoints
${answers.testStrategy === 'comprehensive' ? '- E2E tests (Playwright) voor user flows\n' : ''}- Test coverage voor critical flows
- Error scenario's en edge cases
${commonRefs}
`;
    case 'integration':
      return `# Integration Specialist

## Rol
Specialist voor externe service koppelingen.

## Context
- **MCP servers**: ${answers.requiredMcps.join(', ') || 'filesystem'}
- **Externe services**: ${answers.externalServices.map(s => `${s.name} (${s.purpose})`).join(', ') || 'geen'}

## Focus
- MCP configuraties in \`.mcp.json\`
- Externe API integraties
- Service authenticatie en error handling
- Environment variables in \`.env.example\`
${commonRefs}
- \`.mcp.json\` — MCP server configuratie
`;
    case 'devops':
      return `# DevOps Specialist

## Rol
Deployment en infrastructuur specialist voor ${answers.deploymentTarget}.

## Context
- **Platform**: ${answers.deploymentTarget}
- **Domain**: ${answers.hasDomain ? (answers.domainName || 'custom domain') : 'nog te configureren'}

## Focus
- Deployment configuratie voor ${answers.deploymentTarget}
- Environment variables beheer
- SSL en DNS${answers.hasDomain ? ` voor ${answers.domainName || 'custom domain'}` : ''}
- Health checks en monitoring
- CI/CD pipeline setup
${commonRefs}
- \`.env.example\` — Benodigde environment variables
`;
    default:
      return `# ${id} Specialist\n\n## Rol\nSpecialist voor ${id}.\n${commonRefs}\n`;
  }
}

// ============================================
// Design Skill Template (FIX 6: concrete tokens)
// ============================================

export function generateDesignSkillTemplate(answers: WizardAnswers): string {
  const sections: string[] = [];

  // Header
  sections.push(`---
name: design
description: Projectspecifiek design systeem voor ${answers.projectName}.
---

# Design Skill

## Projectspecifieke Richting
- **Stijl**: ${answers.designStyle}
- **Kleurenschema**: ${answers.colorScheme} mode
- **Typografie**: ${answers.typography}
- **Component stijl**: ${answers.componentStyle}
- **Navigatie**: ${answers.navigationPattern}
- **UI Library**: ${answers.uiLibrary}
- **Framework**: ${answers.frontendFramework}
`);

  // Screenshot-gebaseerde secties
  if (answers.screenshotAnalysis && answers.screenshotAnalysis.length > 0) {
    const tokens = extractDesignTokens(answers.screenshotAnalysis);
    const firstAnalysis = answers.screenshotAnalysis[0]?.analysis as Record<string, unknown>;
    const hasNewFormat = firstAnalysis && isNewAnalysisFormat(firstAnalysis);

    // A. Design Tokens (altijd, zowel oud als nieuw formaat)
    const tokenParts: string[] = ['## Design Tokens\n'];
    if (tokens.cssVars) {
      tokenParts.push('### CSS Variabelen\n```css');
      tokenParts.push(tokens.cssVars);
      tokenParts.push('```\n');
    }
    if (tokens.tailwindExtend) {
      tokenParts.push('### Tailwind Configuratie\n```js\n// tailwind.config.js → theme.extend');
      tokenParts.push(tokens.tailwindExtend);
      tokenParts.push('```\n');
    }
    if (tokens.fonts.length > 0) {
      tokenParts.push(`### Aanbevolen Fonts\n${tokens.fonts.map(f => `- ${f}`).join('\n')}\n`);
    }
    sections.push(tokenParts.join('\n'));

    if (hasNewFormat) {
      const analysis = firstAnalysis as ScreenshotAnalysis;
      const confirmed = answers.confirmedEffects?.confirmedEffects || [];

      // B. Layout Structuur
      sections.push(formatLayoutSection(analysis));

      // C. Visuele Effecten (alleen bevestigde)
      sections.push(formatEffectsSection(analysis, confirmed));

      // D. Animaties
      const animHints = analysis.components.animationHints || [];
      const animPrefs = answers.confirmedEffects?.animationPreferences || [];
      sections.push(formatAnimationsSection(animHints, animPrefs));

      // E. Image Placeholders
      sections.push(formatPlaceholdersSection(analysis.imagery.placeholders));

      // F. Decoratieve Patronen
      sections.push(formatPatternsSection(analysis.patterns));

      // G. Sfeer
      sections.push(formatMoodSection(analysis.mood));

      // Component richtlijnen uit analyse
      sections.push(`## Component Stijlen
- **Border radius**: ${analysis.components.borderRadius}
- **Buttons**: ${analysis.components.buttonStyle}
- **Cards**: ${analysis.components.cardStyle}
- **Inputs**: ${analysis.components.inputStyle}
- **Icons**: ${analysis.imagery.iconStyle}
- **Illustraties**: ${analysis.imagery.illustrationStyle}
- **Foto behandeling**: ${analysis.imagery.photoTreatment}
`);
    } else {
      // Oud formaat: per-pagina samenvattingen
      if (tokens.summaries.length > 0) {
        sections.push('## Per Pagina-type');
        for (const s of tokens.summaries) {
          sections.push(`- **${s.label}**: ${s.summary}`);
        }
        sections.push('');
      }
    }
  }

  // Algemene richtlijnen
  sections.push(`## Richtlijnen
- Kies fonts die mooi, uniek en interessant zijn — vermijd generieke fonts
- Commit aan een cohesieve esthetiek met CSS variabelen
- Gebruik animaties voor high-impact momenten
- NOOIT generieke AI-esthetiek (overgebruikte fonts, cliche kleurschemas)
- Elk component moet de gekozen stijl (${answers.designStyle}) consequent doorvoeren
`);

  return sections.filter(s => s.length > 0).join('\n');
}
