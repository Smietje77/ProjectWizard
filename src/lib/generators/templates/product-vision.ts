// src/lib/generators/templates/product-vision.ts
// PRODUCT-VISION.md template generation — alleen als 2+ bonus categorieën zijn beantwoord

import type { WizardAnswers } from '$lib/types/gsd';
import { generateStitchPrompt } from './stitch-prompt';

/**
 * Check of er genoeg product-strategische data is voor een PRODUCT-VISION.md.
 * Minimaal 2 van de 3 bonus-categorieën moeten minstens 1 veld beantwoord hebben.
 */
export function hasEnoughProductStrategy(answers: WizardAnswers): boolean {
  let categoryCount = 0;

  // merk_identiteit
  if (answers.brandPersonality || answers.toneOfVoice || answers.brandAntiPatterns) {
    categoryCount++;
  }
  // business_model
  if (answers.revenueModel || answers.ninetyDayGoal || answers.sixMonthVision || answers.constraints) {
    categoryCount++;
  }
  // lancering_strategie
  if (answers.goToMarket || answers.currentAlternatives || answers.competitorFrustrations) {
    categoryCount++;
  }

  return categoryCount >= 2;
}

export function generateProductVisionTemplate(answers: WizardAnswers): string {
  const sections: string[] = [];

  sections.push(`# Product Vision — ${answers.projectName}`);
  sections.push('');
  sections.push('> Dit document beschrijft de product-strategie en positionering. Gegenereerd door ProjectWizard.');
  sections.push('');

  // Doelgroep & Probleem
  sections.push('## Doelgroep & Probleem');
  sections.push('');
  sections.push(`**Doelgroep:** ${answers.targetUsers}`);
  sections.push(`**Probleem:** ${answers.problemDescription}`);
  sections.push('');

  // Oplossing
  sections.push('## Oplossing');
  sections.push('');
  sections.push(answers.projectGoal);
  sections.push('');

  // Merk & Identiteit (if available)
  if (answers.brandPersonality || answers.toneOfVoice || answers.brandAntiPatterns) {
    sections.push('## Merk & Identiteit');
    sections.push('');
    if (answers.brandPersonality) sections.push(`- **Persoonlijkheid:** ${answers.brandPersonality}`);
    if (answers.toneOfVoice) sections.push(`- **Tone of Voice:** ${answers.toneOfVoice}`);
    if (answers.brandAntiPatterns) sections.push(`- **Vermijden:** ${answers.brandAntiPatterns}`);
    sections.push('');
  }

  // Business Model (if available)
  if (answers.revenueModel || answers.ninetyDayGoal || answers.sixMonthVision || answers.constraints) {
    sections.push('## Business Model');
    sections.push('');
    if (answers.revenueModel) sections.push(`- **Revenue model:** ${answers.revenueModel}`);
    if (answers.ninetyDayGoal) sections.push(`- **90-dagen doel:** ${answers.ninetyDayGoal}`);
    if (answers.sixMonthVision) sections.push(`- **6-maanden visie:** ${answers.sixMonthVision}`);
    if (answers.constraints) sections.push(`- **Beperkingen:** ${answers.constraints}`);
    sections.push('');
  }

  // Lancering (if available)
  if (answers.goToMarket || answers.currentAlternatives || answers.competitorFrustrations) {
    sections.push('## Lancering & Concurrentie');
    sections.push('');
    if (answers.goToMarket) sections.push(`- **Go-to-market:** ${answers.goToMarket}`);
    if (answers.currentAlternatives) sections.push(`- **Huidige alternatieven:** ${answers.currentAlternatives}`);
    if (answers.competitorFrustrations) sections.push(`- **Frustraties met alternatieven:** ${answers.competitorFrustrations}`);
    sections.push('');
  }

  // Stitch sectie
  const stitchPrompt = generateStitchPrompt(answers);
  if (stitchPrompt.length > 30) {
    sections.push('## Visuele Preview (Google Stitch)');
    sections.push('');
    sections.push('Kopieer onderstaande prompt naar [stitch.withgoogle.com](https://stitch.withgoogle.com)');
    sections.push('om een visuele UI-preview van je project te genereren:');
    sections.push('');
    sections.push('```');
    sections.push(stitchPrompt);
    sections.push('```');
    sections.push('');
    sections.push('> Tip: Gebruik "Experimental mode" in Stitch voor de beste resultaten.');
    sections.push('> Je kunt de gegenereerde designs exporteren naar Figma of als HTML/CSS.');
    sections.push('');
  }

  return sections.join('\n');
}
