// src/lib/generators/templates/agents.ts
// Coordinator and specialist agent template generation

import type { WizardAnswers } from '$lib/types/gsd';
import { getActiveSkills } from '../specialist-detection';
import { frameworkName, dbName, authName, uiLibName, entitiesList, servicesList } from './utils';

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
5. **Documenteer** voltooide taken in de voortgang

## Planning

Volg de fasering in \`.planning/ROADMAP.md\`:
${answers.coreFeatures.filter(f => f.priority === 'must').map((f, i) => `${i + 1}. ${f.name}`).join('\n')}

## Beschikbare Skills

De volgende projectspecifieke skills zijn beschikbaar:

${getActiveSkills(answers).map(s => `- \`${s.skillFile}\` — ${s.name}`).join('\n')}

Gebruik deze skills als referentie bij het uitvoeren van taken. Elke skill bevat projectspecifieke richtlijnen, patronen en conventies voor dat domein.

## Regels

- Eén specialist tegelijk per taak
- Lees \`.planning/INITIAL_CONTEXT.md\` voor achtergrond bij elke nieuwe sessie
- Bij twijfel: vraag de gebruiker
- Gebruik \`.planning/REQUIREMENTS.md\` als referentie voor scope
- Raadpleeg de relevante skill voordat je aan een domein-specifieke taak begint
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
