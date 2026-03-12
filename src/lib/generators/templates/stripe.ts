// src/lib/generators/templates/stripe.ts
// Stripe configuration helpers for template generation

import type { WizardAnswers } from '$lib/types/gsd';

// ─── Stripe Configuration Helper ──────────────────────────────────────────

export interface StripeConfig {
  mode: 'test';
  apiVersion: string;
  events: string[];
  webhookEndpoint: string;
  projectType: 'ecommerce' | 'saas' | 'marketplace' | 'simple';
}

export function getStripeConfig(answers: WizardAnswers): StripeConfig | null {
  const hasStripe = answers.externalServices.some(s => s.name.toLowerCase().includes('stripe'));
  if (!hasStripe) return null;

  const text = `${answers.projectGoal} ${answers.problemDescription}`.toLowerCase();
  const isSvelteKit = answers.frontendFramework === 'sveltekit';

  const webhookEndpoint = isSvelteKit
    ? 'src/routes/api/webhooks/stripe/+server.ts'
    : answers.frontendFramework === 'nextjs'
      ? 'app/api/webhooks/stripe/route.ts'
      : 'server/api/webhooks/stripe.post.ts';

  const ecommerceKeywords = ['webshop', 'winkelwagen', 'bestelling', 'e-commerce', 'ecommerce', 'shop', 'winkel', 'product', 'order', 'cart', 'checkout'];
  const saasKeywords = ['abonnement', 'subscription', 'saas', 'plan', 'maandelijks', 'jaarlijks', 'monthly', 'yearly', 'recurring', 'membership', 'lidmaatschap'];
  const marketplaceKeywords = ['marketplace', 'platform', 'connect', 'vendor', 'seller', 'verkoper', 'commissie', 'payout'];

  if (marketplaceKeywords.some(k => text.includes(k))) {
    return {
      mode: 'test', apiVersion: '2025-12-18.acacia', projectType: 'marketplace', webhookEndpoint,
      events: ['account.updated', 'payment_intent.succeeded', 'payment_intent.payment_failed', 'transfer.created', 'payout.paid', 'payout.failed', 'checkout.session.completed', 'checkout.session.expired']
    };
  }

  if (saasKeywords.some(k => text.includes(k))) {
    return {
      mode: 'test', apiVersion: '2025-12-18.acacia', projectType: 'saas', webhookEndpoint,
      events: ['customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted', 'invoice.paid', 'invoice.payment_failed', 'checkout.session.completed', 'checkout.session.expired', 'customer.created']
    };
  }

  if (ecommerceKeywords.some(k => text.includes(k))) {
    return {
      mode: 'test', apiVersion: '2025-12-18.acacia', projectType: 'ecommerce', webhookEndpoint,
      events: ['checkout.session.completed', 'checkout.session.expired', 'payment_intent.succeeded', 'payment_intent.payment_failed', 'charge.refunded', 'charge.dispute.created', 'charge.dispute.closed']
    };
  }

  return {
    mode: 'test', apiVersion: '2025-12-18.acacia', projectType: 'simple', webhookEndpoint,
    events: ['payment_intent.succeeded', 'payment_intent.payment_failed', 'checkout.session.completed', 'checkout.session.expired', 'charge.refunded']
  };
}

export function generateStripeSection(config: StripeConfig, isSvelteKit: boolean): string {
  const projectTypeLabels: Record<string, string> = {
    ecommerce: 'E-commerce (bestellingen & betalingen)',
    saas: 'SaaS (abonnementen & facturatie)',
    marketplace: 'Marketplace (Connect & payouts)',
    simple: 'Eenmalige betalingen'
  };

  const handlerImport = isSvelteKit
    ? `import Stripe from 'stripe';
import { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET } from '$env/static/private';
import { error, json } from '@sveltejs/kit';

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '${config.apiVersion}'
});

export async function POST({ request }) {
  const payload = await request.text();
  const sig = request.headers.get('stripe-signature');
  if (!sig) throw error(400, 'Missing stripe-signature header');

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    throw error(400, 'Invalid signature');
  }

  switch (event.type) {
${config.events.map(e => `    case '${e}':\n      // TODO: Implementeer ${e} handler\n      break;`).join('\n')}
    default:
      console.log(\`Unhandled event type: \${event.type}\`);
  }

  return json({ received: true });
}`
    : `import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '${config.apiVersion}'
});

export async function POST(request: Request) {
  const payload = await request.text();
  const sig = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return new Response('Invalid signature', { status: 400 });
  }

  switch (event.type) {
${config.events.map(e => `    case '${e}':\n      // TODO: Implementeer ${e} handler\n      break;`).join('\n')}
    default:
      console.log(\`Unhandled event type: \${event.type}\`);
  }

  return Response.json({ received: true });
}`;

  return `
## Stripe Integratie

### Project Type
${projectTypeLabels[config.projectType]}

### Setup (Test/Sandbox Mode)
1. Maak een account aan op https://dashboard.stripe.com/register
2. Gebruik **test mode** keys (beginnen met \`sk_test_\` en \`pk_test_\`)
3. API versie: \`${config.apiVersion}\`
4. Installeer de SDK: \`npm install stripe\`

> **Belangrijk**: Gebruik ALTIJD test mode keys tijdens ontwikkeling.
> Live keys (sk_live_) pas gebruiken na volledige testing in sandbox.

### Webhook Configuratie
1. Ga naar [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Klik **"Add endpoint"**
3. URL: \`https://{jouw-domain}/api/webhooks/stripe\`
4. API versie: \`${config.apiVersion}\`
5. Selecteer deze events:
${config.events.map(e => `   - \`${e}\``).join('\n')}

### Webhook Handler
\`\`\`typescript
// ${config.webhookEndpoint}
${handlerImport}
\`\`\`

### Lokaal Testen
\`\`\`bash
# Installeer Stripe CLI: https://stripe.com/docs/stripe-cli
stripe listen --forward-to localhost:5173/api/webhooks/stripe
# Kopieer het webhook signing secret (whsec_...) naar .env
\`\`\`
`;
}
