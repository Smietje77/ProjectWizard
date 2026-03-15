// src/lib/generators/templates/prompt-md.ts
// PROMPT.md template generation

import type { WizardAnswers } from '$lib/types/gsd';
import { frameworkName, dbName, authName, uiLibName, servicesList } from './utils';

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

## Planning Context

De \`.planning/\` map bevat de volledige projectcontext die door ProjectWizard is gegenereerd:
- \`INITIAL_CONTEXT.md\` — volledig projectoverzicht en achtergrond
- \`REQUIREMENTS.md\` — alle functionele en technische eisen
- \`ROADMAP.md\` — fases en deliverables

**Gebruik deze bestanden als context — GSD-commando's zijn NIET nodig.**
Als Claude Code een GSD-waarschuwing toont ("Project already initialized"), negeer deze dan.
Begin gewoon met de implementatie op basis van bovenstaande instructies.

## Code Review (optioneel)
Dit project bevat een \`.coderabbit.yaml\` configuratie. Installeer CodeRabbit
via https://github.com/marketplace/coderabbitai voor gratis AI code reviews
op elke pull request. Gratis voor public repositories.
`;
}
