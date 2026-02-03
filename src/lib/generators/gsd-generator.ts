// src/lib/generators/gsd-generator.ts
// Genereert de complete .planning/ folder structuur

import type { 
  WizardAnswers, 
  GSDOutput, 
  GSDProject, 
  GSDRequirement,
  GSDPhase,
  Feature 
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
    config: generateConfig(answers),
    context: generateContextMd(answers),
    state: generateStateMd()
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
`;
}

// ============================================
// ROADMAP.md Generator
// ============================================

function generateRoadmapMd(answers: WizardAnswers, phases: GSDPhase[]): string {
  const phaseBlocks = phases.map(phase => formatPhaseBlock(phase)).join('\n\n---\n\n');
  const timeline = generateTimeline(phases);
  
  return `# Development Roadmap - ${answers.projectName}

## Overview
- **Totaal Phases**: ${phases.length}
- **Geschatte Duur**: ${calculateTotalDuration(phases)}
- **Profiel**: Balanced (moderate risk, guided autonomy)

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

function generateConfig(answers: WizardAnswers): GSDProject {
  const profile = determineProfile(answers);
  
  return {
    version: "1.0",
    projectName: answers.projectName,
    profile: profile,
    settings: {
      riskTolerance: profile === 'aggressive' ? 'high' : profile === 'conservative' ? 'low' : 'moderate',
      autonomyLevel: answers.techLevel === 'beginner' ? 'supervised' : 'guided',
      checkpointFrequency: profile === 'conservative' ? 'task' : 'phase',
      qualityThreshold: answers.testStrategy === 'comprehensive' ? 'strict' : 'standard'
    },
    phases: {
      total: 6,
      current: 1
    }
  };
}

// ============================================
// INITIAL_CONTEXT.md Generator
// ============================================

function generateContextMd(answers: WizardAnswers): string {
  return `# Initial Context & Pre-Decisions

## Over dit document
Dit document bevat alle design decisions die tijdens de wizard zijn gemaakt.
Claude Code kan dit gebruiken om direct te beginnen zonder deze vragen opnieuw te stellen.

---

## Design Decisions

### UI/UX
- **Navigation Pattern**: ${formatNavigation(answers.navigationPattern)}
- **Component Library**: ${answers.uiLibrary}
- **Styling Approach**: ${answers.stylingApproach}
- **Responsive Strategy**: Mobile-first met Tailwind breakpoints

### Architecture  
- **API Pattern**: ${answers.apiPattern.toUpperCase()}
- **State Management**: Svelte stores (built-in)
- **Error Handling**: Try-catch met user-friendly messages
- **Loading States**: Skeleton loaders voor async operaties

### Data
- **Database**: ${answers.database}
- **Auth Method**: ${formatAuthMethod(answers.authMethod)}
- **Caching Strategy**: SvelteKit load functions met invalidation

### Deployment
- **Platform**: ${answers.deploymentTarget}
- **Environment Strategy**: Development → Staging → Production
- **SSL**: ${answers.deploymentTarget === 'dokploy' ? 'Let\'s Encrypt via Dokploy' : 'Platform managed'}

---

## Assumptions
- Gebruiker heeft Node.js 18+ geïnstalleerd
- ${answers.database === 'supabase' ? 'Supabase instance is beschikbaar en geconfigureerd' : 'Database server is beschikbaar'}
- ${answers.deploymentTarget === 'dokploy' ? 'VPS met Dokploy is operationeel' : 'Deployment platform account bestaat'}
- Ontwikkelaar heeft basis kennis van ${answers.frontendFramework}

---

## Open Questions
Deze vragen kunnen tijdens development beantwoord worden:

1. **Email templates**: Welke emails moet de app versturen? (indien van toepassing)
2. **Error tracking**: Sentry of alternatief configureren?
3. **Analytics**: Welke metrics zijn belangrijk om te tracken?

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

function generateStateMd(): string {
  const now = new Date().toISOString();
  
  return `# Project State

## Current Status
- **Phase**: 1 - Foundation
- **Status**: Not Started
- **Last Updated**: ${now}

## Phase Progress
| Phase | Status | Started | Completed |
|-------|--------|---------|-----------|
| 1. Foundation | 🔲 Not Started | - | - |
| 2. Core Backend | 🔲 Not Started | - | - |
| 3. Core Frontend | 🔲 Not Started | - | - |
| 4. Features | 🔲 Not Started | - | - |
| 5. Polish | 🔲 Not Started | - | - |
| 6. Deployment | 🔲 Not Started | - | - |

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
  
  // Features uit wizard
  answers.coreFeatures.forEach(feature => {
    const phase = determinePhase(feature);
    requirements.push({
      id: `REQ-${String(reqCounter++).padStart(3, '0')}`,
      description: feature.description || feature.name,
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

function buildPhases(answers: WizardAnswers, requirements: GSDRequirement[]): GSDPhase[] {
  return [
    {
      number: 1,
      name: 'Foundation',
      goal: 'Project setup, database, en authenticatie',
      duration: '2-3 dagen',
      deliverables: [
        `${answers.frontendFramework} project geïnitialiseerd`,
        `${answers.database} database schema`,
        answers.authMethod !== 'none' ? `Auth met ${formatAuthMethod(answers.authMethod)}` : 'Geen auth (public app)',
        'Basis layout en navigatie'
      ].filter(Boolean),
      requirements: requirements.filter(r => r.phase === 1).map(r => r.id)
    },
    {
      number: 2,
      name: 'Core Backend',
      goal: 'API endpoints en business logic',
      duration: '3-4 dagen',
      deliverables: [
        `${answers.apiPattern.toUpperCase()} API endpoints`,
        'Data models en validatie',
        'Error handling'
      ],
      requirements: requirements.filter(r => r.phase === 2).map(r => r.id)
    },
    {
      number: 3,
      name: 'Core Frontend',
      goal: 'Hoofdinterface en gebruikersflows',
      duration: '3-4 dagen',
      deliverables: [
        'Hoofd UI componenten',
        'Formulieren met validatie',
        'Loading en error states'
      ],
      requirements: requirements.filter(r => r.phase === 3).map(r => r.id)
    },
    {
      number: 4,
      name: 'Features',
      goal: 'Secundaire features en integraties',
      duration: '2-3 dagen',
      deliverables: [
        'Nice-to-have features',
        ...answers.externalServices.map(s => `${s.name} integratie`)
      ],
      requirements: requirements.filter(r => r.phase === 4).map(r => r.id)
    },
    {
      number: 5,
      name: 'Polish',
      goal: 'Testing, optimalisatie, en afwerking',
      duration: '2-3 dagen',
      deliverables: [
        formatTestStrategy(answers.testStrategy),
        'Performance optimalisatie',
        'Responsive fixes',
        'Error handling verbeteren'
      ],
      requirements: requirements.filter(r => r.phase === 5).map(r => r.id)
    },
    {
      number: 6,
      name: 'Deployment',
      goal: 'Production deployment en monitoring',
      duration: '1-2 dagen',
      deliverables: [
        `Deploy naar ${answers.deploymentTarget}`,
        'Environment variables configureren',
        'SSL certificaat',
        'Health checks'
      ],
      requirements: requirements.filter(r => r.phase === 6).map(r => r.id)
    }
  ];
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
  
  if (answers.authMethod !== 'none') {
    stories.push(`| US-${String(counter++).padStart(3, '0')} | gebruiker | kunnen inloggen | ik mijn persoonlijke data kan zien |`);
  }
  
  answers.coreFeatures.slice(0, 5).forEach(feature => {
    stories.push(`| US-${String(counter++).padStart(3, '0')} | gebruiker | ${feature.name.toLowerCase()} | ${feature.description || 'ik dit kan gebruiken'} |`);
  });
  
  return stories.join('\n');
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
