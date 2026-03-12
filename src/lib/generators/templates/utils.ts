// src/lib/generators/templates/utils.ts
// Utility and helper functions for template generation

import type { WizardAnswers } from '$lib/types/gsd';

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

export function frameworkName(fw: string): string {
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

export function dbName(db: string): string {
  const map: Record<string, string> = {
    supabase: 'Supabase (PostgreSQL)',
    postgresql: 'PostgreSQL',
    sqlite: 'SQLite'
  };
  return map[db] || db;
}

export function authName(auth: string): string {
  const map: Record<string, string> = {
    'magic-link': 'Magic Link',
    'email-password': 'Email + Password',
    social: 'Social OAuth',
    none: 'Geen authenticatie'
  };
  return map[auth] || auth;
}

export function uiLibName(lib: string): string {
  const map: Record<string, string> = {
    skeleton: 'Skeleton UI',
    shadcn: 'shadcn/ui',
    daisyui: 'DaisyUI',
    custom: 'Custom Components'
  };
  return map[lib] || lib;
}

export function featuresList(answers: WizardAnswers): string {
  return answers.coreFeatures
    .map(f => `- **${f.name}** (${f.priority}): ${f.description}`)
    .join('\n');
}

export function entitiesList(answers: WizardAnswers): string {
  if (answers.dataEntities.length === 0) return 'Nog geen data entiteiten gedefinieerd.';
  return answers.dataEntities
    .map(e => `- **${e.name}**: ${e.fields.join(', ')}${e.relations.length > 0 ? ` → relaties: ${e.relations.join(', ')}` : ''}`)
    .join('\n');
}

export function servicesList(answers: WizardAnswers): string {
  if (answers.externalServices.length === 0) return 'Geen externe services.';
  return answers.externalServices
    .map(s => `- **${s.name}**: ${s.purpose}${s.mcp ? ` (MCP: ${s.mcp})` : ''}`)
    .join('\n');
}
