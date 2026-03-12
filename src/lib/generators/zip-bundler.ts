// src/lib/generators/zip-bundler.ts
// Bundelt alle GSD bestanden in een downloadbare ZIP

import JSZip from 'jszip';
import type { WizardAnswers } from '$lib/types/gsd';
import { generateGSDFolder } from './gsd-generator';
import { getActiveSpecialists, getActiveSkills } from './specialist-detection';
import { generateTeamMd } from './team-generator';
import {
  sanitizeJson,
  generateClaudeMdTemplate,
  generatePromptMdTemplate,
  generateEnvExampleTemplate,
  generateMcpJsonTemplate,
  generateCoordinatorAgentTemplate,
  getSpecialistTemplate,
  getSkillTemplate,
  generateProductVisionTemplate,
  hasEnoughProductStrategy,
  generateStitchPrompt
} from './templates';

interface BundleOptions {
  includeExistingOutput?: boolean;
  projectName: string;
}

/**
 * Genereert een manifest.json die het gegenereerde project beschrijft.
 * Maakt de output zelfbeschrijvend en agent-discoverable.
 */
function generateManifest(answers: WizardAnswers, projectName: string): string {
  const specialists = getActiveSpecialists(answers);
  const skills = getActiveSkills(answers);

  const manifest = {
    generator: 'ProjectWizard',
    version: '1.0',
    generatedAt: new Date().toISOString(),
    project: {
      name: projectName,
      type: answers.websiteType ?? 'unknown',
      description: answers.projectGoal
    },
    techStack: {
      framework: answers.frontendFramework,
      database: answers.database,
      auth: answers.authMethod,
      uiLibrary: answers.uiLibrary,
      styling: answers.stylingApproach,
      apiPattern: answers.apiPattern,
      deployment: answers.deploymentTarget
    },
    agents: {
      coordinator: 'agents/coordinator.md',
      specialists: specialists.map(s => ({
        id: s.id,
        name: s.name,
        agentFile: s.agentFile,
        skillFile: s.skillFile
      }))
    },
    skills: skills.map(s => ({
      id: s.id,
      file: s.skillFile
    })),
    planning: {
      entryPoint: 'PROMPT.md',
      context: 'CLAUDE.md',
      team: 'TEAM.md',
      roadmap: '.planning/ROADMAP.md',
      requirements: '.planning/REQUIREMENTS.md',
      initialContext: '.planning/INITIAL_CONTEXT.md'
    },
    workflow: {
      step1: 'Lees CLAUDE.md voor projectcontext',
      step2: 'Lees PROMPT.md voor bouwinstructies',
      step3: 'Gebruik .planning/ROADMAP.md voor fasering',
      step4: 'Raadpleeg TEAM.md voor agent team configuratie'
    },
    features: {
      count: answers.coreFeatures.length,
      mustHave: answers.coreFeatures.filter(f => f.priority === 'must').length,
      shouldHave: answers.coreFeatures.filter(f => f.priority === 'should').length,
      niceToHave: answers.coreFeatures.filter(f => f.priority === 'nice').length
    },
    ...(answers.brandPersonality || answers.revenueModel || answers.goToMarket ? {
      productStrategy: {
        ...(answers.brandPersonality ? { brandPersonality: answers.brandPersonality } : {}),
        ...(answers.toneOfVoice ? { toneOfVoice: answers.toneOfVoice } : {}),
        ...(answers.brandAntiPatterns ? { brandAntiPatterns: answers.brandAntiPatterns } : {}),
        ...(answers.revenueModel ? { revenueModel: answers.revenueModel } : {}),
        ...(answers.ninetyDayGoal ? { ninetyDayGoal: answers.ninetyDayGoal } : {}),
        ...(answers.sixMonthVision ? { sixMonthVision: answers.sixMonthVision } : {}),
        ...(answers.constraints ? { constraints: answers.constraints } : {}),
        ...(answers.goToMarket ? { goToMarket: answers.goToMarket } : {}),
        ...(answers.currentAlternatives ? { currentAlternatives: answers.currentAlternatives } : {}),
        ...(answers.competitorFrustrations ? { competitorFrustrations: answers.competitorFrustrations } : {})
      }
    } : {})
  };

  return JSON.stringify(manifest, null, 2);
}

/**
 * Genereert een complete project ZIP met .planning/ folder
 * Gebruikt dezelfde specialist-detectie als de streaming/JSON flow
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
    planningFolder.file('config.json', sanitizeJson(JSON.stringify(gsd.config, null, 2)));
    planningFolder.file('INITIAL_CONTEXT.md', gsd.context);
    planningFolder.file('STATE.md', gsd.state);
  }

  // Voeg standaard project bestanden toe
  if (options.includeExistingOutput !== false) {
    projectFolder.file('CLAUDE.md', generateClaudeMdTemplate(answers));
    projectFolder.file('PROMPT.md', generatePromptMdTemplate(answers));
    projectFolder.file('.env.example', generateEnvExampleTemplate(answers));
    projectFolder.file('.mcp.json', generateMcpJsonTemplate(answers));

    // manifest.json — zelfbeschrijvend projectoverzicht
    projectFolder.file('manifest.json', generateManifest(answers, options.projectName));

    // TEAM.md — Agent Team configuratie
    projectFolder.file('TEAM.md', generateTeamMd(answers));

    // Agents folder — dynamisch op basis van specialist-detectie
    const agentsFolder = projectFolder.folder('agents');
    if (agentsFolder) {
      agentsFolder.file('coordinator.md', generateCoordinatorAgentTemplate(answers));

      const specialistsFolder = agentsFolder.folder('specialists');
      if (specialistsFolder) {
        const specialists = getActiveSpecialists(answers);
        for (const specialist of specialists) {
          const content = getSpecialistTemplate(specialist.id, answers);
          specialistsFolder.file(`${specialist.id}.md`, content);
        }
      }
    }

    // Skills folder — dynamisch op basis van specialist-detectie
    const skills = getActiveSkills(answers);
    if (skills.length > 0) {
      const skillsFolder = projectFolder.folder('.claude')?.folder('skills');
      if (skillsFolder) {
        for (const skill of skills) {
          if (skill.skillFile) {
            const fileName = skill.skillFile.split('/').pop() || `${skill.id}.md`;
            const content = getSkillTemplate(skill.id, answers);
            skillsFolder.file(fileName, content);
          }
        }
      }
    }

    // PRODUCT-VISION.md — alleen als 2+ bonus categorieën zijn beantwoord
    if (hasEnoughProductStrategy(answers)) {
      projectFolder.file('PRODUCT-VISION.md', generateProductVisionTemplate(answers));
    }

    // STITCH-PROMPT.txt — altijd als er voldoende data is
    const stitchPrompt = generateStitchPrompt(answers);
    if (stitchPrompt.length > 30) {
      projectFolder.file('STITCH-PROMPT.txt', [
        '# Google Stitch UI Preview Prompt',
        '# Kopieer dit naar: https://stitch.withgoogle.com',
        '# Gebruik Experimental mode voor beste resultaten',
        '',
        stitchPrompt
      ].join('\n'));
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
    planningFolder.file('config.json', sanitizeJson(JSON.stringify(gsd.config, null, 2)));
    planningFolder.file('INITIAL_CONTEXT.md', gsd.context);
    planningFolder.file('STATE.md', gsd.state);
  }

  return await zip.generateAsync({ type: 'blob' });
}

// Export voor gebruik in generate/+server.ts (streaming flow)
export { generateManifest };
