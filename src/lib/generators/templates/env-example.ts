// src/lib/generators/templates/env-example.ts
// .env.example template generation

import type { WizardAnswers } from '$lib/types/gsd';
import { getStripeConfig } from './stripe';

// ─── .env.example Template ─────────────────────────────────────────────────

export function generateEnvExampleTemplate(answers: WizardAnswers): string {
  const lines: string[] = [
    `# ${answers.projectName} — Environment Variables`,
    `# Kopieer naar .env en vul de waarden in`,
    ''
  ];

  // Database
  if (answers.database === 'supabase') {
    lines.push('# Supabase');
    lines.push('PUBLIC_SUPABASE_URL=https://your-project.supabase.co');
    lines.push('PUBLIC_SUPABASE_ANON_KEY=your-anon-key');
    lines.push('SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
    lines.push('');
  } else if (answers.database === 'postgresql') {
    lines.push('# PostgreSQL');
    lines.push('DATABASE_URL=postgresql://user:password@localhost:5432/dbname');
    lines.push('');
  } else if (answers.database === 'sqlite') {
    lines.push('# SQLite');
    lines.push('DATABASE_URL=file:./data/app.db');
    lines.push('');
  }

  // Auth
  if (answers.authMethod === 'social') {
    lines.push('# OAuth Providers');
    lines.push('GOOGLE_CLIENT_ID=');
    lines.push('GOOGLE_CLIENT_SECRET=');
    lines.push('GITHUB_CLIENT_ID=');
    lines.push('GITHUB_CLIENT_SECRET=');
    lines.push('');
  }

  // Stripe (special handling met sandbox info)
  const stripeConfig = getStripeConfig(answers);
  if (stripeConfig) {
    lines.push(`# Stripe (TEST MODE — gebruik sk_test_ keys!)`);
    lines.push(`# Dashboard: https://dashboard.stripe.com/test/apikeys`);
    lines.push(`# API versie: ${stripeConfig.apiVersion}`);
    lines.push('STRIPE_SECRET_KEY=sk_test_...');
    lines.push('STRIPE_PUBLISHABLE_KEY=pk_test_...');
    lines.push('STRIPE_WEBHOOK_SECRET=whsec_...');
    lines.push(`# Webhook events: ${stripeConfig.events.join(', ')}`);
    lines.push('');
  }

  // Other external services (excl. Stripe)
  for (const service of answers.externalServices) {
    if (service.name.toLowerCase().includes('stripe')) continue;
    lines.push(`# ${service.name}`);
    lines.push(`${service.name.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_API_KEY=`);
    lines.push('');
  }

  // Deployment
  if (answers.deploymentTarget === 'dokploy') {
    lines.push('# Dokploy');
    lines.push('DOKPLOY_URL=https://your-dokploy-instance.com');
    lines.push('');
  }

  // Gemini (optioneel)
  lines.push('# Google Gemini API (optioneel)');
  lines.push('# Wordt gebruikt voor design skill generatie als alternatief voor Claude');
  lines.push('# Krijg je key op: https://aistudio.google.com/app/apikeys');
  lines.push('GEMINI_API_KEY=');
  lines.push('');

  // Google Stitch (AI UI Design)
  lines.push('# Google Stitch (AI UI Design)');
  lines.push('# Genereer professionele UI designs vanuit tekst prompts');
  lines.push('# API key: stitch.withgoogle.com → profiel → Stitch Settings → API Keys');
  lines.push('STITCH_API_KEY=');
  lines.push('');

  // General
  lines.push('# Applicatie');
  if (answers.frontendFramework === 'sveltekit') {
    lines.push('PUBLIC_APP_URL=http://localhost:5173');
  } else if (answers.frontendFramework === 'nextjs') {
    lines.push('NEXT_PUBLIC_APP_URL=http://localhost:3000');
  } else {
    lines.push('NUXT_PUBLIC_APP_URL=http://localhost:3000');
  }
  lines.push('NODE_ENV=development');

  return lines.join('\n');
}
