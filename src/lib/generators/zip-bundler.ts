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
  getSkillTemplate
} from './templates';

interface BundleOptions {
  includeExistingOutput?: boolean;  // Include CLAUDE.md, PROMPT.md, etc.
  projectName: string;
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
            // Haal filename uit skillFile path (bijv. '.claude/skills/design.md' -> 'design.md')
            const fileName = skill.skillFile.split('/').pop() || `${skill.id}.md`;
            const content = getSkillTemplate(skill.id, answers);
            skillsFolder.file(fileName, content);
          }
        }
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
    planningFolder.file('config.json', sanitizeJson(JSON.stringify(gsd.config, null, 2)));
    planningFolder.file('INITIAL_CONTEXT.md', gsd.context);
    planningFolder.file('STATE.md', gsd.state);
  }

  return await zip.generateAsync({ type: 'blob' });
}
