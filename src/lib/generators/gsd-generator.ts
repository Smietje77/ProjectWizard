// src/lib/generators/gsd-generator.ts
// Genereert de complete .planning/ folder structuur

import type {
  WizardAnswers,
  GSDOutput,
  GSDProject,
  GSDSettings,
  GSDRequirement,
  GSDPhase,
  Feature,
  DataEntity,
  ExternalService,
  PageScreenshot
} from '$lib/types/gsd';

/**
 * Hoofdfunctie: genereert alle GSD bestanden uit wizard antwoorden
 */
export function generateGSDFolder(answers: WizardAnswers): GSDOutput {
  const requirements = buildRequirements(answers);
  const phases = buildPhases(answers, requirements);
  
  return {
    project: generateProjectMd(answers),
    requirements: generateRequirementsMd(answers, requirements),
    roadmap: generateRoadmapMd(answers, phases),
    config: generateConfig(answers, phases),
    context: generateContextMd(answers),
    state: generateStateMd(phases)
  };
}

// ============================================
// PROJECT.md Generator
// ============================================

function generateProjectMd(answers: WizardAnswers): string {
  const techStack = formatTechStack(answers);
  const mcps = answers.requiredMcps.map(m => `- ${m}`).join('\n');
  const outOfScope = answers.outOfScope.map(s => `- ${s}`).join('\n');
  
  return `# ${answers.projectName}

## Vision
${answers.projectGoal}

## Problem Statement
${answers.problemDescription}

## Target Users
${answers.targetUsers}

**Technical Level**: ${formatTechLevel(answers.techLevel)}

## Success Criteria
- Gebruikers kunnen de kernfunctionaliteit gebruiken zonder technische kennis
- Applicatie is responsive en werkt op desktop en mobiel
- Data wordt veilig opgeslagen met juiste authenticatie
- Deployment is geautomatiseerd via ${answers.deploymentTarget}

## Tech Stack
${techStack}

## Non-Goals (Out of Scope v1)
${outOfScope || '- Geen specifieke items gedefinieerd'}

## Tools & MCPs
${mcps || '- Geen MCP servers geconfigureerd'}

## Deployment
- **Platform**: ${formatDeployment(answers.deploymentTarget)}
- **Domain**: ${answers.hasDomain ? answers.domainName : 'Nog te configureren'}
`;
}

// ============================================
// REQUIREMENTS.md Generator
// ============================================

function generateRequirementsMd(answers: WizardAnswers, requirements: GSDRequirement[]): string {
  const functional = requirements.filter(r => r.category === 'functional');
  const technical = requirements.filter(r => r.category === 'technical');
  const quality = requirements.filter(r => r.category === 'quality');
  
  const functionalTable = functional.map(r => 
    `| ${r.id} | ${r.description} | ${formatPriority(r.priority)} | ${r.phase} |`
  ).join('\n');
  
  const technicalTable = technical.map(r =>
    `| ${r.id} | ${r.description} | ${getCategoryLabel(r)} |`
  ).join('\n');
  
  const qualityTable = quality.map(r =>
    `| ${r.id} | ${r.description} | ${getMetric(r)} |`
  ).join('\n');
  
  const userStories = generateUserStories(answers);
  
  return `# Requirements - ${answers.projectName}

## Overzicht
- **Totaal Requirements**: ${requirements.length}
- **Must Have**: ${requirements.filter(r => r.priority === 'must').length}
- **Should Have**: ${requirements.filter(r => r.priority === 'should').length}
- **Nice to Have**: ${requirements.filter(r => r.priority === 'nice').length}

---

## Functional Requirements

### Core Features
| ID | Requirement | Priority | Phase |
|----|-------------|----------|-------|
${functionalTable}

### User Stories
| ID | Als... | Wil ik... | Zodat... |
|----|--------|-----------|----------|
${userStories}

---

## Technical Requirements
| ID | Requirement | Category |
|----|-------------|----------|
${technicalTable}

---

## Quality Requirements
| ID | Requirement | Metric |
|----|-------------|--------|
${qualityTable}

---

## Dependency Graph
\`\`\`
Phase 1 (Foundation)
├── REQ-001 (Auth) ─┬─> REQ-005 (User Dashboard)
├── REQ-002 (DB)   ─┤
└── REQ-003 (Base) ─┘

Phase 2 (Core)
├── REQ-004 ─┬─> Phase 3
└── REQ-005 ─┘
\`\`\`

## Acceptance Criteria
Elk requirement is compleet wanneer:
1. Functionaliteit werkt zoals beschreven
2. Code is getest (${formatTestStrategy(answers.testStrategy)})
3. Geen console errors in browser
4. Responsive op mobile en desktop

## Design Referentie
UI-gerelateerde requirements (layout, navigatie, formulieren) moeten consistent zijn met het design systeem.
Zie \`.claude/skills/design.md\` voor kleurenpalet, typografie, component stijlen en responsive richtlijnen.
`;
}

// ============================================
// ROADMAP.md Generator
// ============================================

function generateRoadmapMd(answers: WizardAnswers, phases: GSDPhase[]): string {
  const phaseBlocks = phases.map(phase => formatPhaseBlock(phase)).join('\n\n---\n\n');
  const timeline = generateTimeline(phases);
  const profile = determineProfile(answers);
  const settings = getProfileSettings(profile);

  return `# Development Roadmap - ${answers.projectName}

## Overview
- **Totaal Phases**: ${phases.length}
- **Geschatte Duur**: ${calculateTotalDuration(phases)}
- **Profiel**: ${profile.charAt(0).toUpperCase() + profile.slice(1)} (${settings.riskTolerance} risk, ${settings.autonomyLevel} autonomy)

---

## Timeline
\`\`\`
${timeline}
\`\`\`

---

${phaseBlocks}

---

## Milestones

### MVP Complete ✓
- Phase 1-3 afgerond
- Core functionaliteit werkt
- Basis UI beschikbaar

### Beta Ready ✓
- Phase 1-4 afgerond  
- Alle features geïmplementeerd
- Klaar voor user testing

### Production Ready ✓
- Alle phases afgerond
- Tests passing
- Deployed en gemonitord

---

## Risk Register
| Risk | Impact | Mitigatie |
|------|--------|-----------|
| API rate limits | Medium | Caching implementeren |
| Scope creep | High | Strict vasthouden aan requirements |
| Technical debt | Medium | Refactor momenten inplannen |
`;
}

// ============================================
// config.json Generator
// ============================================

// Deterministische profiel → settings mapping (FIX 6)
function getProfileSettings(profile: GSDProject['profile']): GSDSettings {
  const PROFILE_SETTINGS: Record<string, GSDSettings> = {
    conservative: {
      riskTolerance: 'low',
      autonomyLevel: 'supervised',
      checkpointFrequency: 'task',
      qualityThreshold: 'strict'
    },
    balanced: {
      riskTolerance: 'moderate',
      autonomyLevel: 'guided',
      checkpointFrequency: 'phase',
      qualityThreshold: 'standard'
    },
    aggressive: {
      riskTolerance: 'high',
      autonomyLevel: 'autonomous',
      checkpointFrequency: 'milestone',
      qualityThreshold: 'relaxed'
    }
  };
  return PROFILE_SETTINGS[profile];
}

function generateConfig(answers: WizardAnswers, phases: GSDPhase[]): GSDProject {
  const profile = determineProfile(answers);

  return {
    version: "1.0",
    projectName: answers.projectName,
    profile,
    settings: getProfileSettings(profile),
    phases: {
      total: phases.length,
      current: 1
    }
  };
}

// ============================================
// INITIAL_CONTEXT.md Generator
// ============================================

function generateContextMd(answers: WizardAnswers): string {
  const featuresSection = formatFeaturesForContext(answers.coreFeatures);
  const entitiesSection = formatEntitiesForContext(answers.dataEntities);
  const servicesSection = formatServicesForContext(answers.externalServices);
  const designSection = formatDesignForContext(answers);
  const screenshotSection = formatScreenshotForContext(answers.screenshotAnalysis);

  return `# Initial Context & Pre-Decisions

## Over dit document
Dit document bevat alle design decisions die tijdens de wizard zijn gemaakt.
Claude Code kan dit gebruiken om direct te beginnen zonder deze vragen opnieuw te stellen.
**BELANGRIJK**: Stel GEEN vragen over onderwerpen die hier al beantwoord zijn.

---

## Design Decisions

### UI/UX
- **Navigation Pattern**: ${formatNavigation(answers.navigationPattern)}
- **Component Library**: ${answers.uiLibrary}
- **Styling Approach**: ${answers.stylingApproach}
- **Responsive Strategy**: Mobile-first met Tailwind breakpoints

### Visuele Stijl & Branding
${designSection}

### Architecture
- **API Pattern**: ${answers.apiPattern.toUpperCase()}
- **State Management**: ${getStateManagement(answers.frontendFramework)}
- **Error Handling**: Try-catch met user-friendly messages
- **Loading States**: Skeleton loaders voor async operaties

### Data
- **Database**: ${answers.database}
- **Auth Method**: ${formatAuthMethod(answers.authMethod)}
- **Caching Strategy**: ${getCachingStrategy(answers.frontendFramework)}

### Deployment
- **Platform**: ${answers.deploymentTarget}
- **Environment Strategy**: Development → Staging → Production
- **SSL**: ${answers.deploymentTarget === 'dokploy' ? 'Let\'s Encrypt via Dokploy' : 'Platform managed'}

---

## Core Features (geprioriteerd)

${featuresSection}

---

## Database Schema

${entitiesSection}

---

## Kritieke User Flows
${answers.criticalFlows.length > 0 ? answers.criticalFlows.map(f => `- ${f}`).join('\n') : '_Geen specifieke flows gedefinieerd_'}

---

## Externe Services & Integraties
${servicesSection}

---
${screenshotSection}
## Assumptions
- Gebruiker heeft Node.js 18+ geïnstalleerd
- ${answers.database === 'supabase' ? 'Supabase instance is beschikbaar en geconfigureerd' : 'Database server is beschikbaar'}
- ${answers.deploymentTarget === 'dokploy' ? 'VPS met Dokploy is operationeel' : 'Deployment platform account bestaat'}
- Ontwikkelaar heeft basis kennis van ${answers.frontendFramework}

---

## Code Conventies
- **Taal**: TypeScript strict mode
- **Formatting**: Prettier met standaard config
- **Comments**: Nederlands voor business logic, Engels voor code
- **File naming**: kebab-case voor bestanden, PascalCase voor componenten
`;
}

// ============================================
// STATE.md Generator
// ============================================

function generateStateMd(phases: GSDPhase[]): string {
  const now = new Date().toISOString();
  const phaseRows = phases.map(p =>
    `| ${p.number}. ${p.name} | 🔲 Not Started | - | - |`
  ).join('\n');

  return `# Project State

## Current Status
- **Phase**: 1 - ${phases[0]?.name || 'Foundation'}
- **Status**: Not Started
- **Last Updated**: ${now}

## Phase Progress
| Phase | Status | Started | Completed |
|-------|--------|---------|-----------|
${phaseRows}

## Completed Requirements
_Geen requirements afgerond_

## Current Focus
- [ ] Start Phase 1: Project initialization

## Blockers
_Geen actieve blockers_

## Notes
_Project gegenereerd door ProjectWizard_
`;
}

// ============================================
// Helper Functions
// ============================================

function buildRequirements(answers: WizardAnswers): GSDRequirement[] {
  const requirements: GSDRequirement[] = [];
  let reqCounter = 1;
  
  // Auth requirement (als nodig)
  if (answers.authMethod !== 'none') {
    requirements.push({
      id: `REQ-${String(reqCounter++).padStart(3, '0')}`,
      description: `Gebruikers kunnen ${formatAuthMethod(answers.authMethod)} gebruiken om in te loggen`,
      priority: 'must',
      phase: 1,
      category: 'functional'
    });
  }
  
  // Database setup
  requirements.push({
    id: `REQ-${String(reqCounter++).padStart(3, '0')}`,
    description: `Database schema opgezet in ${answers.database}`,
    priority: 'must',
    phase: 1,
    category: 'technical'
  });
  
  // Base layout
  requirements.push({
    id: `REQ-${String(reqCounter++).padStart(3, '0')}`,
    description: `Basis layout met ${formatNavigation(answers.navigationPattern)} navigatie`,
    priority: 'must',
    phase: 1,
    category: 'functional'
  });
  
  // Features uit wizard — met validatie (FIX 4)
  answers.coreFeatures.forEach(feature => {
    const desc = feature.description || feature.name;
    if (!isValidRequirement(desc)) return;
    const phase = determinePhase(feature);
    requirements.push({
      id: `REQ-${String(reqCounter++).padStart(3, '0')}`,
      description: desc,
      priority: feature.priority,
      phase: phase,
      category: 'functional'
    });
  });
  
  // Technical requirements
  requirements.push({
    id: `TECH-${String(reqCounter++).padStart(3, '0')}`,
    description: `${answers.frontendFramework} project met TypeScript`,
    priority: 'must',
    phase: 1,
    category: 'technical'
  });
  
  requirements.push({
    id: `TECH-${String(reqCounter++).padStart(3, '0')}`,
    description: `Styling met ${answers.stylingApproach} en ${answers.uiLibrary}`,
    priority: 'must',
    phase: 1,
    category: 'technical'
  });
  
  // Quality requirements
  requirements.push({
    id: `QA-001`,
    description: 'Responsive design (mobile + desktop)',
    priority: 'must',
    phase: 5,
    category: 'quality'
  });
  
  if (answers.testStrategy !== 'minimal') {
    requirements.push({
      id: `QA-002`,
      description: `${formatTestStrategy(answers.testStrategy)} test coverage`,
      priority: answers.testStrategy === 'comprehensive' ? 'must' : 'should',
      phase: 5,
      category: 'quality'
    });
  }
  
  // Deployment requirement
  requirements.push({
    id: `REQ-${String(reqCounter++).padStart(3, '0')}`,
    description: `Deployment naar ${answers.deploymentTarget}`,
    priority: 'must',
    phase: 6,
    category: 'technical'
  });
  
  return requirements;
}

export function buildPhases(answers: WizardAnswers, requirements: GSDRequirement[]): GSDPhase[] {
  const phaseCount = determinePhaseCount(answers);
  const entityNames = answers.dataEntities.map(e => e.name).join(', ') || 'data entiteiten';
  const mustFeatures = answers.coreFeatures.filter(f => f.priority === 'must').map(f => f.name);
  const shouldFeatures = answers.coreFeatures.filter(f => f.priority === 'should').map(f => f.name);
  const niceFeatures = answers.coreFeatures.filter(f => f.priority === 'nice').map(f => f.name);

  const phases: GSDPhase[] = [];
  let phaseNum = 1;

  // Phase 1: Foundation (altijd)
  phases.push({
    number: phaseNum++,
    name: 'Foundation',
    goal: `Project setup met ${formatFramework(answers.frontendFramework)}, ${answers.database}, en ${answers.authMethod !== 'none' ? formatAuthMethod(answers.authMethod) : 'basis configuratie'}`,
    duration: '2-3 dagen',
    deliverables: [
      `${formatFramework(answers.frontendFramework)} project met ${answers.stylingApproach} en ${answers.uiLibrary}`,
      `${answers.database} database schema met ${entityNames} tabellen`,
      answers.authMethod !== 'none' ? `${formatAuthMethod(answers.authMethod)} authenticatie met login/registratie flow` : null,
      `${formatNavigation(answers.navigationPattern)} als basis layout`
    ].filter(Boolean) as string[],
    requirements: requirements.filter(r => r.phase === 1).map(r => r.id)
  });

  if (phaseCount === 4) {
    // Simpel project: backend + frontend gecombineerd
    phases.push({
      number: phaseNum++,
      name: 'Core',
      goal: `${answers.apiPattern.toUpperCase()} API, business logic, en hoofdinterface voor ${entityNames}`,
      duration: '4-6 dagen',
      deliverables: [
        `${answers.apiPattern.toUpperCase()} API endpoints voor ${entityNames}`,
        'Data models en Zod validatie',
        `${answers.uiLibrary} componenten met ${answers.componentStyle} stijl`,
        `${formatNavigation(answers.navigationPattern)} navigatie volledig werkend`,
        'Formulieren met client-side validatie',
        ...mustFeatures.map(f => `${f} volledig werkend`)
      ],
      requirements: requirements.filter(r => r.phase === 2 || r.phase === 3).map(r => r.id)
    });
  } else {
    // Aparte Backend + Frontend fases
    phases.push({
      number: phaseNum++,
      name: 'Core Backend',
      goal: `${answers.apiPattern.toUpperCase()} API en business logic voor ${entityNames}`,
      duration: '3-4 dagen',
      deliverables: [
        `${answers.apiPattern.toUpperCase()} API endpoints voor ${entityNames}`,
        `Data models en Zod validatie voor ${entityNames}`,
        'Error handling en input sanitization',
        ...mustFeatures.filter(f => ['backend', 'auth'].includes(
          answers.coreFeatures.find(cf => cf.name === f)?.category || ''
        )).map(f => `${f} backend logica`)
      ],
      requirements: requirements.filter(r => r.phase === 2).map(r => r.id)
    });

    phases.push({
      number: phaseNum++,
      name: 'Core Frontend',
      goal: 'Hoofdinterface en gebruikersflows',
      duration: '3-4 dagen',
      deliverables: [
        `${answers.uiLibrary} componenten met ${answers.componentStyle} stijl`,
        `${formatNavigation(answers.navigationPattern)} navigatie volledig werkend`,
        'Formulieren met client-side validatie',
        'Loading skeletons en error states',
        ...mustFeatures.filter(f => ['frontend', 'other'].includes(
          answers.coreFeatures.find(cf => cf.name === f)?.category || ''
        )).map(f => `${f} UI`)
      ],
      requirements: requirements.filter(r => r.phase === 3).map(r => r.id)
    });
  }

  if (phaseCount <= 5) {
    // Features + Polish gecombineerd
    phases.push({
      number: phaseNum++,
      name: 'Features & Polish',
      goal: 'Secundaire features, testing en afwerking',
      duration: '3-5 dagen',
      deliverables: [
        ...shouldFeatures.map(f => `${f} volledig werkend`),
        ...niceFeatures.map(f => `${f} (nice-to-have)`),
        ...answers.externalServices.map(s => `${s.name} integratie (${s.purpose})`),
        `${formatTestStrategy(answers.testStrategy)} tests`,
        'Responsive design check (mobile + desktop)',
        'Error handling en edge cases'
      ].filter(d => d.length > 0),
      requirements: requirements.filter(r => r.phase === 4 || r.phase === 5).map(r => r.id)
    });
  } else {
    // Aparte Features + Polish fases
    phases.push({
      number: phaseNum++,
      name: 'Features',
      goal: 'Secundaire features en integraties',
      duration: '2-3 dagen',
      deliverables: [
        ...shouldFeatures.map(f => `${f} volledig werkend`),
        ...niceFeatures.map(f => `${f} (nice-to-have)`),
        ...answers.externalServices.map(s => `${s.name} integratie (${s.purpose})`)
      ].filter(d => d.length > 0),
      requirements: requirements.filter(r => r.phase === 4).map(r => r.id)
    });

    phases.push({
      number: phaseNum++,
      name: 'Polish',
      goal: 'Testing, optimalisatie, en afwerking',
      duration: '2-3 dagen',
      deliverables: [
        `${formatTestStrategy(answers.testStrategy)} tests`,
        answers.criticalFlows.length > 0
          ? `Test coverage voor: ${answers.criticalFlows.join(', ')}`
          : 'Test coverage voor critical flows',
        'Performance optimalisatie (Lighthouse > 90)',
        'Responsive design check (mobile + desktop)',
        'Error handling en edge cases'
      ],
      requirements: requirements.filter(r => r.phase === 5).map(r => r.id)
    });
  }

  // Deployment (altijd laatste fase)
  phases.push({
    number: phaseNum,
    name: 'Deployment',
    goal: `Production deployment naar ${answers.deploymentTarget}`,
    duration: '1-2 dagen',
    deliverables: [
      `Deploy naar ${formatDeployment(answers.deploymentTarget)}`,
      'Environment variables configureren',
      answers.hasDomain ? `DNS en SSL voor ${answers.domainName || 'custom domain'}` : 'SSL certificaat',
      'Health checks en monitoring'
    ],
    requirements: requirements.filter(r => r.phase === 6).map(r => r.id)
  });

  return phases;
}

function determinePhase(feature: Feature): number {
  if (feature.priority === 'must') {
    if (feature.category === 'auth') return 1;
    if (feature.category === 'backend') return 2;
    if (feature.category === 'frontend') return 3;
    return 2; // Default voor must-haves
  }
  if (feature.priority === 'should') return 4;
  return 4; // Nice-to-have
}

function determineProfile(answers: WizardAnswers): 'conservative' | 'balanced' | 'aggressive' {
  // Beginners krijgen conservative, ervaren users kunnen aggressive
  if (answers.techLevel === 'beginner') return 'conservative';
  if (answers.testStrategy === 'comprehensive') return 'conservative';
  if (answers.testStrategy === 'minimal' && answers.techLevel === 'advanced') return 'aggressive';
  return 'balanced';
}

function determinePhaseCount(answers: WizardAnswers): number {
  const featureCount = answers.coreFeatures.length;
  const serviceCount = answers.externalServices.length;
  const hasComprehensiveTests = answers.testStrategy === 'comprehensive';
  const hasManyFeatures = featureCount >= 6;
  const hasServices = serviceCount >= 2;

  // Complex project: 6 fases (aparte features + polish)
  if (hasManyFeatures || (hasServices && hasComprehensiveTests)) return 6;

  // Simpel project: 4 fases (core gecombineerd, features+polish gecombineerd)
  const mustFeatures = answers.coreFeatures.filter(f => f.priority === 'must').length;
  if (mustFeatures <= 2 && serviceCount === 0 && answers.testStrategy === 'minimal') return 4;

  // Medium project: 5 fases (features+polish gecombineerd)
  return 5;
}

function getStateManagement(framework: string): string {
  const map: Record<string, string> = {
    'sveltekit': 'Svelte stores (built-in)',
    'nextjs': 'React useState/useContext + Zustand (indien nodig)',
    'nuxt': 'Vue reactivity + Pinia (indien nodig)'
  };
  return map[framework] || 'Framework state management';
}

function getCachingStrategy(framework: string): string {
  const map: Record<string, string> = {
    'sveltekit': 'SvelteKit load functions met invalidation',
    'nextjs': 'Next.js ISR + React Server Components',
    'nuxt': 'Nuxt useAsyncData + useFetch met caching'
  };
  return map[framework] || 'Framework caching';
}

// Valideer dat een requirement concreet genoeg is (FIX 4)
function isValidRequirement(desc: string): boolean {
  if (desc.length < 10) return false;
  const placeholders = ['et cetera', 'etc.', 'etc', 'enz.', 'enz', 'tbd', 'todo', 'n.v.t', 'nvt', '...'];
  const lower = desc.toLowerCase();
  return !placeholders.some((p) => lower === p || lower.trim() === p);
}

function formatTechStack(answers: WizardAnswers): string {
  return `- **Frontend**: ${formatFramework(answers.frontendFramework)}
- **UI Library**: ${answers.uiLibrary}
- **Styling**: ${answers.stylingApproach}
- **Database**: ${answers.database}
- **Auth**: ${formatAuthMethod(answers.authMethod)}
- **API**: ${answers.apiPattern.toUpperCase()}
- **Deployment**: ${formatDeployment(answers.deploymentTarget)}`;
}

function formatFramework(fw: string): string {
  const map: Record<string, string> = {
    'sveltekit': 'SvelteKit 2.x',
    'nextjs': 'Next.js 14',
    'nuxt': 'Nuxt 3'
  };
  return map[fw] || fw;
}

function formatAuthMethod(method: string): string {
  const map: Record<string, string> = {
    'magic-link': 'Magic Links (passwordless)',
    'email-password': 'Email/Wachtwoord',
    'social': 'Social Login (Google, GitHub)',
    'none': 'Geen authenticatie'
  };
  return map[method] || method;
}

function formatNavigation(nav: string): string {
  const map: Record<string, string> = {
    'sidebar': 'Sidebar navigatie (links)',
    'topbar': 'Top navigatie bar',
    'bottombar': 'Bottom navigation (mobile-style)',
    'none': 'Geen vaste navigatie'
  };
  return map[nav] || nav;
}

function formatDeployment(target: string): string {
  const map: Record<string, string> = {
    'dokploy': 'Dokploy (self-hosted)',
    'vercel': 'Vercel',
    'coolify': 'Coolify'
  };
  return map[target] || target;
}

function formatTechLevel(level: string): string {
  const map: Record<string, string> = {
    'beginner': 'Beginner - weinig tot geen technische ervaring',
    'intermediate': 'Intermediate - basis programmeerkennis',
    'advanced': 'Advanced - ervaren developer'
  };
  return map[level] || level;
}

function formatPriority(priority: string): string {
  const map: Record<string, string> = {
    'must': 'Must Have',
    'should': 'Should Have',
    'nice': 'Nice to Have'
  };
  return map[priority] || priority;
}

function formatTestStrategy(strategy: string): string {
  const map: Record<string, string> = {
    'minimal': 'Minimale tests (manual testing)',
    'standard': 'Standaard test coverage (E2E voor kritieke flows)',
    'comprehensive': 'Uitgebreide tests (unit + integration + E2E)'
  };
  return map[strategy] || strategy;
}

function getCategoryLabel(req: GSDRequirement): string {
  // Simplified category extraction
  if (req.description.toLowerCase().includes('database')) return 'Database';
  if (req.description.toLowerCase().includes('api')) return 'API';
  if (req.description.toLowerCase().includes('deploy')) return 'Infrastructure';
  return 'Setup';
}

function getMetric(req: GSDRequirement): string {
  if (req.description.toLowerCase().includes('responsive')) return 'Works on 320px-1920px';
  if (req.description.toLowerCase().includes('test')) return 'Coverage target';
  return 'Pass/Fail';
}

function generateUserStories(answers: WizardAnswers): string {
  const stories: string[] = [];
  let counter = 1;
  const role = extractUserRole(answers.targetUsers);

  if (answers.authMethod !== 'none') {
    stories.push(`| US-${String(counter++).padStart(3, '0')} | ${role} | veilig kunnen inloggen en mijn account beheren | ik toegang heb tot mijn persoonlijke data en instellingen |`);
  }

  answers.coreFeatures.slice(0, 6).forEach(feature => {
    const action = featureToAction(feature.name);
    const value = featureToValue(feature);
    stories.push(`| US-${String(counter++).padStart(3, '0')} | ${role} | ${action} | ${value} |`);
  });

  return stories.join('\n');
}

function extractUserRole(targetUsers: string): string {
  const lower = targetUsers.toLowerCase();
  if (lower.includes('admin') || lower.includes('beheerder')) return 'beheerder';
  if (lower.includes('klant') || lower.includes('customer') || lower.includes('koper')) return 'klant';
  if (lower.includes('medewerker') || lower.includes('werknemer') || lower.includes('employee')) return 'medewerker';
  if (lower.includes('student') || lower.includes('leerling')) return 'student';
  if (lower.includes('bezoeker') || lower.includes('visitor')) return 'bezoeker';
  if (lower.includes('eigenaar') || lower.includes('owner')) return 'eigenaar';
  return 'gebruiker';
}

function featureToAction(featureName: string): string {
  const lower = featureName.toLowerCase();
  // Al een werkwoord aan het begin
  if (/^(zoek|filter|beheer|bekijk|maak|voeg|bewerk|verwijder|upload|download|deel|exporteer|importeer)/.test(lower)) {
    return lower;
  }
  // Bekende patronen → werkwoord-gerichte acties
  const actionMap: [RegExp, string][] = [
    [/zoek|search|filter/, `${lower} gebruiken om resultaten te vinden`],
    [/dashboard/, `mijn ${lower} bekijken met overzicht van relevante data`],
    [/profiel|profile|account/, `mijn ${lower} bekijken en aanpassen`],
    [/notificatie|notification|alert/, `${lower} ontvangen over belangrijke updates`],
    [/rapport|report|statistiek|analytics/, `${lower} genereren en inzien`],
    [/upload|import/, `bestanden uploaden via ${lower}`],
    [/export|download/, `data exporteren via ${lower}`],
    [/chat|bericht|message/, `berichten sturen en ontvangen via ${lower}`],
    [/betaling|payment|checkout/, `veilig afrekenen via ${lower}`],
    [/winkelwagen|cart/, `producten toevoegen aan en beheren in ${lower}`],
    [/product|catalogus|catalog/, `${lower} doorzoeken en bekijken`],
  ];

  for (const [pattern, action] of actionMap) {
    if (pattern.test(lower)) return action;
  }

  return `${lower} gebruiken`;
}

function featureToValue(feature: Feature): string {
  if (feature.description && feature.description.length > 15) {
    return feature.description;
  }

  const valueMap: Record<string, string> = {
    'auth': 'mijn gegevens veilig zijn en alleen ik toegang heb',
    'frontend': 'ik een prettige en intuïtieve ervaring heb',
    'backend': 'de applicatie betrouwbaar en snel werkt',
    'other': 'ik efficiënter kan werken'
  };

  return valueMap[feature.category] || 'dit mij helpt mijn doel te bereiken';
}

function formatPhaseBlock(phase: GSDPhase): string {
  const deliverables = phase.deliverables.map(d => `- [ ] ${d}`).join('\n');
  const reqs = phase.requirements.length > 0 
    ? phase.requirements.join(', ') 
    : '_Geen specifieke requirements_';
  
  return `## Phase ${phase.number}: ${phase.name} (${phase.duration})

**Goal**: ${phase.goal}

### Deliverables
${deliverables}

### Requirements Addressed
${reqs}

### Definition of Done
- [ ] Alle deliverables geïmplementeerd
- [ ] Code reviewed (self-review OK voor solo projects)
- [ ] Geen console errors
- [ ] Werkt op localhost`;
}

function generateTimeline(phases: GSDPhase[]): string {
  // Simple ASCII timeline
  return phases.map(p => 
    `Week ${Math.ceil(p.number / 2)}: Phase ${p.number} - ${p.name} (${p.duration})`
  ).join('\n');
}

function calculateTotalDuration(phases: GSDPhase[]): string {
  // Estimate based on phase durations
  let minDays = 0;
  let maxDays = 0;
  
  phases.forEach(p => {
    const match = p.duration.match(/(\d+)-(\d+)/);
    if (match) {
      minDays += parseInt(match[1]);
      maxDays += parseInt(match[2]);
    }
  });
  
  const minWeeks = Math.ceil(minDays / 5);
  const maxWeeks = Math.ceil(maxDays / 5);
  
  return `${minWeeks}-${maxWeeks} weken`;
}

// ============================================
// INITIAL_CONTEXT.md Detail Formatters
// ============================================

function formatFeaturesForContext(features: Feature[]): string {
  if (features.length === 0) return '_Geen features gedefinieerd_';

  const grouped = {
    must: features.filter(f => f.priority === 'must'),
    should: features.filter(f => f.priority === 'should'),
    nice: features.filter(f => f.priority === 'nice')
  };

  const lines: string[] = [];

  if (grouped.must.length > 0) {
    lines.push('### Must Have');
    grouped.must.forEach(f => {
      lines.push(`- **${f.name}** (${f.category}): ${f.description || 'Geen beschrijving'}`);
    });
  }

  if (grouped.should.length > 0) {
    lines.push('\n### Should Have');
    grouped.should.forEach(f => {
      lines.push(`- **${f.name}** (${f.category}): ${f.description || 'Geen beschrijving'}`);
    });
  }

  if (grouped.nice.length > 0) {
    lines.push('\n### Nice to Have');
    grouped.nice.forEach(f => {
      lines.push(`- **${f.name}** (${f.category}): ${f.description || 'Geen beschrijving'}`);
    });
  }

  return lines.join('\n');
}

function formatEntitiesForContext(entities: DataEntity[]): string {
  if (entities.length === 0) return '_Geen data entiteiten gedefinieerd_';

  return entities.map(entity => {
    const fields = entity.fields.length > 0
      ? entity.fields.map(f => `  - ${f}`).join('\n')
      : '  - _Geen velden gespecificeerd_';
    const relations = entity.relations.length > 0
      ? `\n  - **Relaties**: ${entity.relations.join(', ')}`
      : '';
    return `### ${entity.name}\n${fields}${relations}`;
  }).join('\n\n');
}

function formatServicesForContext(services: ExternalService[]): string {
  if (services.length === 0) return '_Geen externe services_';

  return services.map(s => {
    const mcp = s.mcp ? ` (MCP: ${s.mcp})` : '';
    return `- **${s.name}**: ${s.purpose}${mcp}`;
  }).join('\n');
}

function formatDesignForContext(answers: WizardAnswers): string {
  const styleMap: Record<string, string> = {
    'minimalistisch': 'Minimalistisch — clean, veel whitespace, subtiele accenten',
    'zakelijk': 'Zakelijk/professioneel — strak, betrouwbaar, corporate',
    'speels': 'Speels — kleurrijk, afgeronde vormen, friendly',
    'brutalistisch': 'Brutalistisch — bold, raw, onconventioneel',
    'custom': 'Custom stijl (zie screenshot analyse)'
  };

  const componentMap: Record<string, string> = {
    'rounded': 'Afgeronde hoeken (rounded-lg/xl)',
    'sharp': 'Scherpe hoeken (geen border-radius)',
    'neumorphic': 'Neumorphism (soft shadows, embossed effect)',
    'glassmorphism': 'Glassmorphism (blur, transparantie)'
  };

  const colorMap: Record<string, string> = {
    'dark': 'Donker thema (dark mode standaard)',
    'light': 'Licht thema (light mode standaard)',
    'auto': 'Automatisch (volgt systeemvoorkeur)'
  };

  const typoMap: Record<string, string> = {
    'sans-serif': 'Sans-serif (Inter, system-ui)',
    'serif': 'Serif (Merriweather, Georgia)',
    'mono': 'Monospace (JetBrains Mono, Fira Code)',
    'mixed': 'Mix (sans-serif body, serif headings)'
  };

  return `- **Design Stijl**: ${styleMap[answers.designStyle] || answers.designStyle}
- **Kleurenschema**: ${colorMap[answers.colorScheme] || answers.colorScheme}
- **Typography**: ${typoMap[answers.typography] || answers.typography}
- **Component Stijl**: ${componentMap[answers.componentStyle] || answers.componentStyle}
- **Design Tokens**: Zie \`.claude/skills/design.md\` voor gedetailleerde CSS variabelen en Tailwind configuratie`;
}

function formatScreenshotForContext(screenshots: PageScreenshot[] | null | undefined): string {
  if (!screenshots || screenshots.length === 0) return '';

  const sections = screenshots.map(s => {
    const analysis = typeof s.analysis === 'object'
      ? JSON.stringify(s.analysis, null, 2)
      : String(s.analysis);
    return `### ${s.label} (${s.pageType})\n\`\`\`json\n${analysis}\n\`\`\``;
  }).join('\n\n');

  return `## Design Analyse (uit screenshots)\n\n> **Tip**: De concrete CSS variabelen en Tailwind configuratie op basis van deze screenshots staan in \`.claude/skills/design.md\`.\n\n${sections}\n\n---\n\n`;
}
