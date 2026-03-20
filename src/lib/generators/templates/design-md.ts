// src/lib/generators/templates/design-md.ts
// DESIGN.md generator — Stitch 2.0-compatible design system beschrijving

import type { WizardAnswers } from '$lib/types/gsd';
import { getDesignPreset } from '$lib/data/design-presets';

/**
 * Genereert een DESIGN.md in Stitch 2.0-compatible formaat.
 * Beschrijft het design system zodat Stitch consistentie
 * kan bewaken over alle gegenereerde schermen.
 */
export function generateDesignMd(answers: WizardAnswers): string {
  const preset = answers.designPreset ? getDesignPreset(answers.designPreset) : null;
  const sections: string[] = [];

  // Header
  sections.push(`# Design System — ${answers.projectName}`);
  sections.push('');
  sections.push('> Dit bestand is compatibel met Google Stitch DESIGN.md import.');
  sections.push('> Importeer in Stitch via het canvas menu voor consistente UI generatie.');
  sections.push('');

  // Design Principles
  sections.push('## Design Principles');
  if (answers.brandPersonality) {
    sections.push(`- **Brand Personality:** ${answers.brandPersonality}`);
  }
  if (answers.toneOfVoice) {
    sections.push(`- **Tone of Voice:** ${answers.toneOfVoice}`);
  }
  if (answers.brandAntiPatterns) {
    sections.push(`- **Anti-patterns:** ${answers.brandAntiPatterns}`);
  }
  if (answers.designStyle) {
    sections.push(`- **Style:** ${answers.designStyle}`);
  }
  sections.push('');

  // Color System
  sections.push('## Color System');
  if (preset?.colors) {
    const c = preset.colors;
    sections.push('| Token | Value | Usage |');
    sections.push('|-------|-------|-------|');
    sections.push(`| primary | ${c.primary} | Buttons, links, active states |`);
    sections.push(`| secondary | ${c.secondary} | Supporting elements |`);
    sections.push(`| accent | ${c.accent} | Highlights, badges, CTAs |`);
    sections.push(`| background | ${c.background} | Page background |`);
    sections.push(`| surface | ${c.surface} | Cards, modals, panels |`);
    sections.push(`| text | ${c.text} | Body text |`);
    sections.push(`| textMuted | ${c.textMuted} | Secondary text |`);
    sections.push(`| border | ${c.border} | Borders, dividers |`);
  } else {
    sections.push(`- Theme: ${answers.colorScheme ?? 'light'}`);
    if (answers.selectedPalette) {
      sections.push(`- Palette: ${answers.selectedPalette}`);
    }
  }
  sections.push(`- Mode: ${answers.colorScheme === 'dark' ? 'Dark' : answers.colorScheme === 'auto' ? 'Auto (dark/light)' : 'Light'}`);
  sections.push('');

  // Typography
  sections.push('## Typography');
  if (preset?.fonts) {
    sections.push(`- **Heading:** ${preset.fonts.heading}`);
    sections.push(`- **Body:** ${preset.fonts.body}`);
    sections.push(`- **Mono:** ${preset.fonts.mono}`);
    if (preset.fonts.googleFontsUrl) {
      sections.push(`- **Google Fonts:** ${preset.fonts.googleFontsUrl}`);
    }
  } else {
    const fontMap: Record<string, string> = {
      'sans-serif': 'Inter, system-ui, sans-serif',
      'serif': 'Merriweather, Georgia, serif',
      'mono': 'JetBrains Mono, Fira Code, monospace',
      'mixed': 'Inter for body, Playfair Display for headings'
    };
    sections.push(`- **Font stack:** ${fontMap[answers.typography] ?? fontMap['sans-serif']}`);
  }
  sections.push('');

  // Component Guidelines
  sections.push('## Components');
  const componentMap: Record<string, string> = {
    'rounded': 'border-radius: 8-12px, soft shadows, padded containers',
    'sharp': 'border-radius: 0-2px, crisp borders, compact spacing',
    'neumorphic': 'soft inner/outer shadows, subtle depth, muted colors',
    'glassmorphism': 'backdrop-blur, semi-transparent surfaces, subtle borders'
  };
  sections.push(`- **Style:** ${componentMap[answers.componentStyle] ?? componentMap['rounded']}`);
  if (preset?.style) {
    sections.push(`- **Border radius:** ${preset.style.borderRadius}`);
    sections.push(`- **Shadow:** ${preset.style.shadow}`);
  }
  sections.push(`- **UI Library:** ${answers.uiLibrary}`);
  if (answers.uiStyleDetail) {
    sections.push(`- **Aesthetic:** ${answers.uiStyleDetail}`);
  }
  sections.push('');

  // Layout
  sections.push('## Layout');
  sections.push(`- **Navigation:** ${answers.navigationPattern ?? 'topbar'}`);
  sections.push(`- **Platform:** ${answers.websiteType === 'mobile_app' ? 'Mobile-first' : 'Desktop-first, responsive'}`);
  sections.push('- **Content width:** max-w-7xl (1280px)');
  sections.push('- **Spacing scale:** 4px base (4, 8, 12, 16, 24, 32, 48, 64)');

  return sections.join('\n');
}
