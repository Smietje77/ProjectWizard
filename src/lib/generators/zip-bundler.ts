// src/lib/generators/zip-bundler.ts
// Bundelt alle GSD bestanden in een downloadbare ZIP

import JSZip from 'jszip';
import type { GSDOutput, WizardAnswers } from '$lib/types/gsd';
import { generateGSDFolder } from './gsd-generator';

interface BundleOptions {
  includeExistingOutput?: boolean;  // Include CLAUDE.md, PROMPT.md, etc.
  projectName: string;
}

/**
 * Genereert een complete project ZIP met .planning/ folder
 */
export async function generateProjectBundle(
  answers: WizardAnswers,
  options: BundleOptions
): Promise<Blob> {
  const zip = new JSZip();
  const projectFolder = zip.folder(options.projectName);
  
  if (!projectFolder) {
    throw new Error('Kon project folder niet aanmaken');
  }
  
  // Genereer GSD output
  const gsd = generateGSDFolder(answers);
  
  // Maak .planning/ folder
  const planningFolder = projectFolder.folder('.planning');
  if (planningFolder) {
    planningFolder.file('PROJECT.md', gsd.project);
    planningFolder.file('REQUIREMENTS.md', gsd.requirements);
    planningFolder.file('ROADMAP.md', gsd.roadmap);
    planningFolder.file('config.json', JSON.stringify(gsd.config, null, 2));
    planningFolder.file('INITIAL_CONTEXT.md', gsd.context);
    planningFolder.file('STATE.md', gsd.state);
  }
  
  // Voeg standaard project bestanden toe
  if (options.includeExistingOutput !== false) {
    projectFolder.file('CLAUDE.md', generateClaudeMd(answers));
    projectFolder.file('PROMPT.md', generatePromptMd(answers));
    projectFolder.file('.env.example', generateEnvExample(answers));

    // Agents folder
    const agentsFolder = projectFolder.folder('agents');
    if (agentsFolder) {
      agentsFolder.file('coordinator.md', generateCoordinatorAgent(answers));

      const specialistsFolder = agentsFolder.folder('specialists');
      if (specialistsFolder) {
        // Voeg alleen relevante specialists toe
        if (answers.authMethod !== 'none' || answers.database) {
          specialistsFolder.file('backend.md', getBackendSpecialist());
        }
        specialistsFolder.file('frontend.md', getFrontendSpecialist());
      }
    }

    // Design skill (altijd genereren als er design data is)
    if (answers.designStyle) {
      const skillsFolder = projectFolder.folder('.claude')?.folder('skills');
      if (skillsFolder) {
        skillsFolder.file('design.md', generateDesignSkillFromAnswers(answers));
      }
    }
  }
  
  // Genereer ZIP blob
  return await zip.generateAsync({ 
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });
}

/**
 * Genereer alleen de .planning/ folder als ZIP
 */
export async function generatePlanningOnly(answers: WizardAnswers): Promise<Blob> {
  const zip = new JSZip();
  const gsd = generateGSDFolder(answers);
  
  const planningFolder = zip.folder('.planning');
  if (planningFolder) {
    planningFolder.file('PROJECT.md', gsd.project);
    planningFolder.file('REQUIREMENTS.md', gsd.requirements);
    planningFolder.file('ROADMAP.md', gsd.roadmap);
    planningFolder.file('config.json', JSON.stringify(gsd.config, null, 2));
    planningFolder.file('INITIAL_CONTEXT.md', gsd.context);
    planningFolder.file('STATE.md', gsd.state);
  }
  
  return await zip.generateAsync({ type: 'blob' });
}

// ============================================
// Template Generators voor andere bestanden
// ============================================

function generateClaudeMd(answers: WizardAnswers): string {
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

## GSD Workflow
Dit project gebruikt het GSD framework. Zie \`.planning/\` voor:
- PROJECT.md - Visie en scope
- REQUIREMENTS.md - Alle requirements met IDs
- ROADMAP.md - Gefaseerd implementatieplan
- config.json - GSD configuratie

Start met: \`/gsd:new-project\` of \`/gsd:status\`

## Code Conventies
- TypeScript strict mode
- ${answers.frontendFramework === 'sveltekit' ? 'Svelte 5 runes syntax' : 'Modern framework conventions'}
- Nederlandse comments voor business logic
- Engelse code/variabelen
`;
}

function generatePromptMd(answers: WizardAnswers): string {
  return `# ${answers.projectName} - Startprompt voor Claude Code

## Status
**Dit is een NIEUW project met GSD workflow.**

## GSD Framework
Dit project heeft een complete \`.planning/\` folder. Gebruik:
- \`/gsd:new-project\` - Start het project
- \`/gsd:status\` - Bekijk voortgang
- \`/gsd:next\` - Volgende taak

## Wat te bouwen
${answers.projectGoal}

## Requirements
Zie \`.planning/REQUIREMENTS.md\` voor alle requirements met IDs.

## Roadmap  
Zie \`.planning/ROADMAP.md\` voor het gefaseerde plan.

## Nu starten
1. Review de \`.planning/\` folder
2. Run \`/gsd:new-project\`
3. Begin met Phase 1

## Tech Stack (al besloten)
- ${answers.frontendFramework}
- ${answers.database}
- ${answers.uiLibrary} + ${answers.stylingApproach}
- Deploy via ${answers.deploymentTarget}
`;
}

function generateEnvExample(answers: WizardAnswers): string {
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

function generateCoordinatorAgent(answers: WizardAnswers): string {
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

## Specialist Delegatie
- Backend: Database en API werk
- Frontend: UI componenten en styling
`;
}

function getBackendSpecialist(): string {
  return `# Backend Specialist

## Rol
Backend developer voor API en database werk.

## Focus
- Database schema's
- API endpoints
- Validatie en error handling
- Row Level Security
`;
}

function getFrontendSpecialist(): string {
  return `# Frontend Specialist

## Rol
UI/UX specialist voor interface werk.

## Focus
- Componenten bouwen
- Responsive design
- Forms en validatie
- Loading states
`;
}

function generateDesignSkillFromAnswers(answers: WizardAnswers): string {
  const screenshotSection = answers.screenshotAnalysis
    ? `\n## Design Referentie (van screenshot)\n\`\`\`json\n${JSON.stringify(answers.screenshotAnalysis, null, 2)}\n\`\`\`\nVolg deze specifieke kleuren, typografie en componentstijl.\n`
    : '';

  return `---
name: design
description: Projectspecifiek design systeem voor ${answers.projectName}.
---

# Design Skill

## Projectspecifieke Richting
- **Stijl**: ${answers.designStyle}
- **Kleurenschema**: ${answers.colorScheme} mode
- **Typografie**: ${answers.typography}
- **Component stijl**: ${answers.componentStyle}
- **UI Library**: ${answers.uiLibrary}
- **Framework**: ${answers.frontendFramework}
${screenshotSection}
## Richtlijnen
- Kies fonts die mooi, uniek en interessant zijn — vermijd generieke fonts
- Commit aan een cohesieve esthetiek met CSS variabelen
- Gebruik animaties voor high-impact momenten
- NOOIT generieke AI-esthetiek (overgebruikte fonts, cliche kleurschemas)
- Elk component moet de gekozen stijl (${answers.designStyle}) consequent doorvoeren
`;
}
