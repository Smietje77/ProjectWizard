// src/lib/generators/templates/stitch-prompt.ts
// Google Stitch UI-preview prompt generatie

import type { WizardAnswers } from '$lib/types/gsd';

/**
 * Genereert een beknopte prompt voor Google Stitch (stitch.withgoogle.com).
 * Stitch werkt het best met 1-3 zinnen: platform, projectnaam, navigatie,
 * design stijl, kleurschema, kernfeatures. Geen technische stack details.
 */
export function generateStitchPrompt(answers: WizardAnswers): string {
  const platform = answers.websiteType === 'mobile_app' ? 'mobile' : 'web';
  const features = answers.coreFeatures
    .filter(f => f.priority === 'must')
    .map(f => f.name)
    .join(', ');

  const parts = [
    `Design a ${platform} application for "${answers.projectName}"`,
    answers.projectGoal ? `that ${answers.projectGoal.toLowerCase()}` : '',
    `with ${answers.navigationPattern ?? 'topbar'} navigation`,
    answers.designStyle ? `using a ${answers.designStyle} design style` : '',
    answers.colorScheme === 'dark' ? 'with a dark theme' : 'with a light theme',
    answers.componentStyle ? `and ${answers.componentStyle} components` : '',
    features ? `Key screens: ${features}` : '',
    answers.brandPersonality ? `The overall feel should be: ${answers.brandPersonality}` : '',
    answers.brandAntiPatterns ? `Avoid: ${answers.brandAntiPatterns}` : ''
  ];

  return parts.filter(Boolean).join('. ') + '.';
}
