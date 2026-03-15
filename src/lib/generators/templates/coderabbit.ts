// src/lib/generators/templates/coderabbit.ts
// .coderabbit.yaml template — altijd meegeleverd, geen API nodig

import type { WizardAnswers } from '$lib/types/gsd';

export function generateCodeRabbitConfig(answers: WizardAnswers): string {
  const framework = answers.frontendFramework ?? 'sveltekit';

  // Framework-specifieke pad-instructies
  const pathInstructions: Record<string, string> = {
    sveltekit: `    - path: "src/routes/**"
      instructions: "Focus op SvelteKit conventies: +page.svelte, +server.ts, load functies, form actions."
    - path: "src/lib/**"
      instructions: "Focus op Svelte 5 runes ($state, $derived, $effect), type safety, herbruikbaarheid."`,
    nextjs: `    - path: "app/**"
      instructions: "Focus op Next.js App Router: server/client components, generateMetadata, route handlers."
    - path: "components/**"
      instructions: "Focus op React best practices, props typing, hooks correctheid."`,
    nuxt: `    - path: "pages/**"
      instructions: "Focus op Nuxt conventies: definePageMeta, useAsyncData, middleware."
    - path: "composables/**"
      instructions: "Focus op Vue 3 Composition API, reactivity, type safety."`
  };

  return `# CodeRabbit AI Code Review Configuration
# Installeer via: https://github.com/marketplace/coderabbitai
# Gratis voor public repositories

reviews:
  auto_review:
    enabled: true
    drafts: false
    base_branches:
      - main
  profile: chill
  path_instructions:
${pathInstructions[framework] ?? pathInstructions.sveltekit}
    - path: "**/*.test.ts"
      instructions: "Focus op test coverage, edge cases, geen flaky tests."

chat:
  auto_reply: true

path_filters:
  - "!package-lock.json"
  - "!node_modules/**"
  - "!**/*.snap"
  - "!.planning/**"
`;
}
