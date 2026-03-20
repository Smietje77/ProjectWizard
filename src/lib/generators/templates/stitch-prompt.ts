// src/lib/generators/templates/stitch-prompt.ts
// Google Stitch 2.0 — multi-screen UI design prompt generatie

import type { WizardAnswers } from '$lib/types/gsd';
import { getDesignPreset } from '$lib/data/design-presets';

interface StitchScreen {
  name: string;
  prompt: string;
}

/**
 * Genereert de hoofdprompt die de algehele design-richting beschrijft.
 * Dit is de "vibe design" prompt die Stitch 2.0 het best begrijpt.
 */
function generateVibePrompt(answers: WizardAnswers): string {
  const platform = answers.websiteType === 'mobile_app' ? 'mobile' : 'web';
  const preset = answers.designPreset ? getDesignPreset(answers.designPreset) : null;

  const parts: string[] = [
    `Design a ${platform} application called "${answers.projectName}".`
  ];

  if (answers.projectGoal) {
    parts.push(`The goal: ${answers.projectGoal}.`);
  }
  if (answers.targetUsers) {
    parts.push(`Target users: ${answers.targetUsers}.`);
  }

  // Design richting — gebruik preset als beschikbaar
  if (preset) {
    parts.push(`Design style: ${preset.name} — ${preset.description ?? ''}.`);
    if (preset.colors?.primary) {
      parts.push(`Primary color: ${preset.colors.primary}.`);
    }
  } else {
    if (answers.designStyle) parts.push(`Design style: ${answers.designStyle}.`);
    if (answers.selectedPalette) parts.push(`Color palette: ${answers.selectedPalette}.`);
    if (answers.uiStyleDetail) parts.push(`UI aesthetic: ${answers.uiStyleDetail}.`);
  }

  if (answers.colorScheme) parts.push(`Theme: ${answers.colorScheme}.`);
  if (answers.componentStyle) parts.push(`Components: ${answers.componentStyle}.`);
  if (answers.navigationPattern) parts.push(`Navigation: ${answers.navigationPattern}.`);
  if (answers.typography) parts.push(`Typography: ${answers.typography}.`);

  // Brand personality (cruciaal voor vibe designing)
  if (answers.brandPersonality) {
    parts.push(`Brand personality: ${answers.brandPersonality}.`);
  }
  if (answers.toneOfVoice) {
    parts.push(`The UI should feel: ${answers.toneOfVoice}.`);
  }
  if (answers.brandAntiPatterns) {
    parts.push(`Avoid: ${answers.brandAntiPatterns}.`);
  }

  return parts.join(' ');
}

/**
 * Genereert scherm-specifieke prompts op basis van features en websiteType.
 * Elke must-have feature krijgt een eigen scherm-prompt.
 */
function generateScreenPrompts(answers: WizardAnswers): StitchScreen[] {
  const screens: StitchScreen[] = [];
  const platform = answers.websiteType === 'mobile_app' ? 'mobile' : 'web';

  // Altijd een landing/home screen
  screens.push({
    name: 'landing',
    prompt: `Design the landing page / home screen for "${answers.projectName}" (${platform}). `
      + `${answers.projectGoal ? `Show how the app helps: ${answers.projectGoal}. ` : ''}`
      + `Include a hero section, clear CTA, and key value propositions. `
      + `${answers.navigationPattern ? `Use ${answers.navigationPattern} navigation.` : ''}`
  });

  // Auth screen als auth methode is gekozen
  if (answers.authMethod && answers.authMethod !== 'none') {
    const authType = answers.authMethod === 'social' ? 'social login (Google, GitHub)'
      : answers.authMethod === 'magic-link' ? 'magic link email login'
      : 'email and password login';
    screens.push({
      name: 'auth',
      prompt: `Design a clean login/signup page with ${authType} for "${answers.projectName}".`
    });
  }

  // Dashboard als het een SaaS/B2B/admin type is
  const needsDashboard = ['saas_b2b', 'saas_b2c', 'admin_dashboard', 'internal_tool']
    .includes(answers.websiteType ?? '');
  if (needsDashboard) {
    screens.push({
      name: 'dashboard',
      prompt: `Design the main dashboard for "${answers.projectName}". `
        + `Show key metrics, recent activity, and quick actions. `
        + `${answers.navigationPattern === 'sidebar' ? 'Use a sidebar with collapsible menu.' : ''}`
    });
  }

  // Feature-specifieke schermen (must-have features)
  const mustFeatures = answers.coreFeatures.filter(f => f.priority === 'must');
  for (const feature of mustFeatures.slice(0, 5)) {
    screens.push({
      name: feature.name.toLowerCase().replace(/\s+/g, '-'),
      prompt: `Design the "${feature.name}" screen for "${answers.projectName}". `
        + `${feature.description ? feature.description + '. ' : ''}`
        + `This is a core feature that users interact with frequently.`
    });
  }

  return screens;
}

/**
 * Genereert het volledige STITCH-PROMPT.txt bestand.
 * Bevat: vibe prompt + individuele scherm-prompts + tips.
 *
 * Export signature behouden voor backward compatibility.
 */
export function generateStitchPrompt(answers: WizardAnswers): string {
  const vibePrompt = generateVibePrompt(answers);
  const screens = generateScreenPrompts(answers);

  const sections: string[] = [
    '# Google Stitch — UI Design Prompts',
    `# Project: ${answers.projectName}`,
    '# Gegenereerd door ProjectWizard',
    '',
    '## Instructies',
    '1. Ga naar https://stitch.withgoogle.com',
    '2. Kies "Experimental mode" voor de beste resultaten (Gemini 2.5 Pro)',
    '3. Kopieer eerst de VIBE PROMPT hieronder als startpunt',
    '4. Gebruik daarna de individuele SCHERM PROMPTS voor specifieke paginas',
    '5. Optioneel: importeer DESIGN.md (als meegeleverd) voor design system consistentie',
    '',
    '## Vibe Prompt (kopieer dit als eerste)',
    '```',
    vibePrompt,
    '```',
    '',
    '## Scherm Prompts',
    'Gebruik deze in Stitch nadat je de vibe prompt hebt ingevoerd.',
    'Stitch onthoudt de context van je project.',
    ''
  ];

  for (const screen of screens) {
    sections.push(`### ${screen.name}`);
    sections.push('```');
    sections.push(screen.prompt);
    sections.push('```');
    sections.push('');
  }

  sections.push('## Pro Tips');
  sections.push('- Gebruik "Show me 3 variations" voor meerdere opties');
  sections.push('- Exporteer naar Figma via Standard mode voor verdere bewerking');
  sections.push('- Gebruik voice canvas om live aanpassingen te bespreken');
  sections.push('- Stitch Prototypes: verbind schermen met "Stitch screens together"');

  return sections.join('\n');
}
