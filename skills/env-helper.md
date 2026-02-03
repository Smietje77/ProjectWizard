---
name: env-helper
description: Skill voor het begeleid invullen van environment variabelen. Biedt guided input met links naar dashboards voor het verkrijgen van API keys.
---

# Environment Helper Skill

## Doel
Help gebruikers hun .env bestand correct in te vullen met de juiste API keys en configuraties.

## Guided Flow per Service

### Supabase
```yaml
variabelen:
  - SUPABASE_URL
  - SUPABASE_ANON_KEY
  - SUPABASE_SERVICE_ROLE_KEY

vraag: "Heb je al een Supabase project?"
ja_flow:
  - "Ga naar je Supabase dashboard"
  - "Klik op Settings → API"
  - "Kopieer de URL en keys"
nee_flow:
  link: "https://supabase.com/dashboard"
  instructie: "Maak een nieuw project aan en kom dan terug"
later_optie: true
```

### Anthropic (Claude API)
```yaml
variabelen:
  - ANTHROPIC_API_KEY

vraag: "Heb je al een Anthropic API key?"
ja_flow:
  - "Vul hieronder je API key in"
nee_flow:
  link: "https://console.anthropic.com/settings/keys"
  instructie: "Maak een account aan en genereer een API key"
later_optie: true
```

### Stripe (indien nodig)
```yaml
variabelen:
  - STRIPE_SECRET_KEY
  - STRIPE_PUBLISHABLE_KEY
  - STRIPE_WEBHOOK_SECRET

vraag: "Heb je al een Stripe account?"
ja_flow:
  - "Ga naar Stripe Dashboard → Developers → API keys"
nee_flow:
  link: "https://dashboard.stripe.com/register"
  instructie: "Maak een Stripe account aan"
later_optie: true
test_mode_hint: "Begin met test keys (beginnen met sk_test_)"
```

### Resend (indien nodig)
```yaml
variabelen:
  - RESEND_API_KEY

vraag: "Heb je al een Resend account?"
nee_flow:
  link: "https://resend.com/signup"
  instructie: "Maak een account aan voor email verzending"
later_optie: true
```

## UI Component
```svelte
<EnvInput
  service="supabase"
  variables={['SUPABASE_URL', 'SUPABASE_ANON_KEY']}
  dashboardLink="https://supabase.com/dashboard"
  helpText="Je vindt deze onder Settings → API"
  onSkip={() => markAsLater('supabase')}
/>
```

## Validatie
- Check format van keys (bijv. sk-ant- voor Anthropic)
- Test connectie indien mogelijk
- Waarschuw bij test vs productie keys

## Veiligheid
- Sla keys alleen lokaal op
- Voeg .env.local toe aan .gitignore
- Toon nooit volledige keys in UI (mask)
