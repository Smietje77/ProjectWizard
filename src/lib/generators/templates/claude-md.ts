// src/lib/generators/templates/claude-md.ts
// CLAUDE.md template generation

import type { WizardAnswers } from '$lib/types/gsd';
import { frameworkName, dbName, authName, uiLibName, featuresList, entitiesList, servicesList } from './utils';

// ─── CLAUDE.md Template ────────────────────────────────────────────────────

export function generateClaudeMdTemplate(answers: WizardAnswers): string {
  const screenshotSection = answers.screenshotAnalysis?.length
    ? `\n## Design Referenties\n\nDit project bevat screenshot-analyses als design referentie. Volg de design skill (.claude/skills/design.md) voor implementatie details.\n`
    : '';

  const productContextLines: string[] = [];
  if (answers.brandPersonality) productContextLines.push(`- **Brand**: ${answers.brandPersonality}`);
  if (answers.toneOfVoice) productContextLines.push(`- **Tone**: ${answers.toneOfVoice}`);
  if (answers.brandAntiPatterns) productContextLines.push(`- **Anti-patterns**: ${answers.brandAntiPatterns}`);
  if (answers.revenueModel) productContextLines.push(`- **Revenue**: ${answers.revenueModel}`);
  if (answers.ninetyDayGoal) productContextLines.push(`- **90-dagen doel**: ${answers.ninetyDayGoal}`);
  if (answers.goToMarket) productContextLines.push(`- **Go-to-market**: ${answers.goToMarket}`);

  const productContextSection = productContextLines.length > 0
    ? `\n## Product Context\n\n${productContextLines.join('\n')}\n`
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
${productContextSection}${screenshotSection}
## Projectstructuur

Zie \`.planning/\` folder voor projectcontext (INITIAL_CONTEXT.md, REQUIREMENTS.md, ROADMAP.md).
Zie \`TEAM.md\` voor agent team configuratie.
Zie \`agents/\` folder voor individuele agent instructies.

> **Note:** De \`.planning/\` bestanden zijn gegenereerd door ProjectWizard — geen GSD workflow.
> GSD-commando's zijn niet nodig. Gebruik de bestanden direct als context.
`;
}
