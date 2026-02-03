---
name: wizard-flow
description: Skill voor het beheren van de wizard vragenflow in ProjectWizard. Gebruik voor het orchestreren van vragen, opslaan van antwoorden, en bepalen van voortgang.
---

# Wizard Flow Skill

## Doel
Beheer de stapsgewijze vragenflow van ProjectWizard.

## Flow Regels

### 1. Start
- Ontvang vrije tekst invoer van gebruiker
- Analyseer met Coordinator agent
- Bepaal eerste vraag en specialist

### 2. Per Vraag
```
1. Toon vraag van specialist
2. Toon advies met uitleg
3. Bied antwoord opties:
   - Multiple choice opties
   - Vrije tekst invoer
   - "Ik heb een vraag" knop
4. Wacht op antwoord
5. Sla antwoord op in Supabase
6. Update live preview
7. Bepaal volgende vraag of markeer compleet
```

### 3. Tussendoor Opslaan
- Automatisch opslaan na elk antwoord
- Handmatig opslaan via knop
- Sessie ID voor later terugkeren

### 4. Completeness Check
De Coordinator bepaalt of compleet op basis van:
- Alle verplichte vragen beantwoord
- Geen conflicterende antwoorden
- Tech stack volledig bepaald
- MCP's geïdentificeerd

## State Management
```typescript
interface WizardState {
  projectId: string;
  projectName: string;
  initialDescription: string;
  currentStep: number;
  totalSteps: number; // Max 50
  answers: Answer[];
  currentSpecialist: string;
  isComplete: boolean;
  generatedOutput: GeneratedOutput | null;
}

interface Answer {
  questionId: string;
  specialist: string;
  question: string;
  answer: string;
  timestamp: Date;
}
```

## Voortgang Berekening
```
voortgang = (beantwoorde_verplichte_vragen / totaal_verplichte_vragen) * 100
```

Verplichte categorieën:
- [ ] Project doel (Requirements)
- [ ] Doelgroep (Requirements)
- [ ] Kernfunctionaliteiten (Requirements)
- [ ] Frontend keuze (Architect)
- [ ] Database keuze (Architect)
- [ ] Auth keuze (Architect)
- [ ] Deployment keuze (DevOps)
