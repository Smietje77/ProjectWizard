// src/lib/generators/eval-generator.ts
// Skills 2.0: Genereert test cases (evals) voor elke skill
// Evals worden meegeleverd in de projectoutput zodat gebruikers kunnen valideren
// dat een skill daadwerkelijk beter presteert dan het basismodel.

import type { WizardAnswer } from '$lib/types';
import type { WizardAnswers } from '$lib/types/gsd';
import type { SkillCategory } from './skill-generator';
import { streamWithRetry } from '$lib/server/anthropic-client';

// ─── Types ────────────────────────────────────────────────────────────────

export interface SkillEval {
    /** Naam van de test case */
    name: string;
    /** Type: trigger (moet skill activeren), negative (mag niet activeren), quality (verwachte kwaliteit) */
    type: 'trigger' | 'negative' | 'quality';
    /** De prompt die je in Claude Code zou typen */
    prompt: string;
    /** Wat je verwacht dat er gebeurt */
    verwacht_gedrag: string;
    /** Beoordelingscriteria */
    criteria: string[];
}

export interface EvalFile {
    path: string;
    content: string;
}

// ─── AI Prompt ────────────────────────────────────────────────────────────

const EVAL_GENERATOR_PROMPT = `Je genereert test cases (evals) voor een Claude Code skill.

Doel: de gebruiker kan deze test-prompts in Claude Code uitvoeren om te valideren dat de skill
daadwerkelijk een verbetering oplevert ten opzichte van het basismodel zonder skill.

Genereer EXACT 5 test cases in het volgende markdown formaat:

### Test 1: [naam]
**Type:** trigger | negative | quality
**Prompt:**
\`\`\`
[de prompt die je in Claude Code zou typen]
\`\`\`
**Verwacht gedrag:** [wat er zou moeten gebeuren]
**Criteria:**
- [criterium 1]
- [criterium 2]
- [criterium 3]

Regels:
- Minstens 2 TRIGGER tests (prompts die de skill moeten activeren)
- Minstens 1 NEGATIVE test (prompt die de skill NIET moet activeren)
- Minstens 1 QUALITY test (prompt waar het resultaat MET skill beter moet zijn dan zonder)
- Prompts moeten realistisch zijn — alsof een echte developer ze zou typen
- Bij capability_uplift skills: focus op of het model de JUISTE technieken/patronen gebruikt
- Bij workflow skills: focus op of het model het JUISTE proces volgt
- Schrijf in het Nederlands`;

// ─── Fallback Templates ───────────────────────────────────────────────────

function generateFallbackEvals(
    specialistId: string,
    projectName: string,
    category: SkillCategory
): SkillEval[] {
    const evals: SkillEval[] = [];

    // Altijd: trigger test
    evals.push({
        name: `${specialistId} skill wordt geactiveerd`,
        type: 'trigger',
        prompt: specialistId === 'backend'
            ? `Maak een nieuwe API endpoint voor het ophalen van ${projectName} data`
            : specialistId === 'testing'
                ? `Schrijf tests voor de belangrijkste functionaliteit van ${projectName}`
                : specialistId === 'devops'
                    ? `Deploy ${projectName} naar productie`
                    : specialistId === 'security'
                        ? `Review de security van ${projectName}`
                        : `Configureer de externe service integraties voor ${projectName}`,
        verwacht_gedrag: `Claude Code gebruikt de ${specialistId} skill en volgt de projectspecifieke patronen`,
        criteria: [
            'Skill wordt herkend en gevolgd',
            'Output volgt de conventies uit de skill',
            'Projectspecifieke keuzes worden gerespecteerd',
        ],
    });

    // Trigger test 2
    evals.push({
        name: `${specialistId} skill past projectcontext toe`,
        type: 'trigger',
        prompt: specialistId === 'backend'
            ? `Voeg input validatie toe aan alle API endpoints`
            : specialistId === 'testing'
                ? `Voeg E2E tests toe voor de kritieke user flows`
                : specialistId === 'devops'
                    ? `Configureer de CI/CD pipeline`
                    : specialistId === 'security'
                        ? `Implementeer de security headers`
                        : `Voeg error handling toe aan de API client`,
        verwacht_gedrag: `De output bevat projectspecifieke details (gekozen framework, database, etc.)`,
        criteria: [
            'Gebruikt het juiste framework (niet een willekeurig ander)',
            'Referenties naar projectspecifieke tools en libraries',
            'Code is direct bruikbaar in het project',
        ],
    });

    // Negative test
    evals.push({
        name: `Niet-gerelateerde prompt triggert skill NIET`,
        type: 'negative',
        prompt: specialistId === 'backend'
            ? `Verander de achtergrondkleur van de header naar blauw`
            : specialistId === 'testing'
                ? `Voeg een nieuw veld toe aan het gebruikersprofiel`
                : specialistId === 'devops'
                    ? `Fix de CSS layout op mobiel`
                    : specialistId === 'security'
                        ? `Maak een mooie landingspagina`
                        : `Schrijf unit tests voor de auth module`,
        verwacht_gedrag: `Claude Code voert de taak uit ZONDER de ${specialistId} skill te activeren`,
        criteria: [
            `De ${specialistId} skill wordt niet onnodig getriggerd`,
            'Het resultaat is een normale uitvoering van de gevraagde taak',
        ],
    });

    // Quality test
    evals.push({
        name: `Kwaliteitsverbetering door skill`,
        type: 'quality',
        prompt: specialistId === 'backend'
            ? `Maak een nieuwe CRUD endpoint met validatie en error handling`
            : specialistId === 'testing'
                ? `Schrijf een complete test suite voor de auth flow`
                : specialistId === 'devops'
                    ? `Maak het project klaar voor productie deployment`
                    : specialistId === 'security'
                        ? `Doe een security audit van de applicatie`
                        : `Integreer een nieuwe externe API met retry logic`,
        verwacht_gedrag: category === 'capability_uplift'
            ? `Met skill: gebruikt projectspecifieke patronen en best practices. Zonder skill: generiekere output.`
            : `Met skill: volgt het exacte stappen-plan uit de workflow. Zonder skill: mist mogelijk stappen.`,
        criteria: [
            'Output met skill is concreter en projectspecifieker',
            'Output zonder skill mist waarschijnlijk details',
            'Verschil is meetbaar (meer stappen, betere code, correctere patronen)',
        ],
    });

    // Quality test 2
    evals.push({
        name: `Edge case handling`,
        type: 'quality',
        prompt: specialistId === 'backend'
            ? `Hoe ga ik om met een database connection timeout?`
            : specialistId === 'testing'
                ? `Hoe mock ik de external API in mijn tests?`
                : specialistId === 'devops'
                    ? `Wat doe ik als de deployment mislukt?`
                    : specialistId === 'security'
                        ? `Hoe voorkom ik SQL injection in mijn queries?`
                        : `Wat als de externe API down is?`,
        verwacht_gedrag: `Met skill: geeft projectspecifiek antwoord met code voorbeelden voor de gekozen stack`,
        criteria: [
            'Antwoord is specifiek voor de gekozen tech stack',
            'Bevat concrete code voorbeelden',
            'Houdt rekening met projectspecifieke context',
        ],
    });

    return evals;
}

// ─── Markdown Formatting ──────────────────────────────────────────────────

function evalsToMarkdown(
    specialistId: string,
    projectName: string,
    category: SkillCategory,
    evals: SkillEval[]
): string {
    const categoryLabel = category === 'capability_uplift'
        ? 'Capability Uplift'
        : 'Workflow';

    const header = `# Eval Tests — ${specialistId} skill
> **Project:** ${projectName}
> **Skill categorie:** ${categoryLabel}
> **Doel:** Valideer dat de ${specialistId} skill daadwerkelijk waarde toevoegt

## Hoe te gebruiken

1. **Met skill**: Voer elke test-prompt uit in Claude Code met de skill geïnstalleerd
2. **Zonder skill**: Verwijder/hernoem de skill en voer dezelfde prompt opnieuw uit
3. **Vergelijk**: Beoordeel beide resultaten op de genoemde criteria
4. **Besluit**: Als de skill geen meetbare verbetering oplevert, overweeg om deze te verwijderen

${category === 'capability_uplift'
            ? '> ⚠️ **Let op:** Dit is een capability_uplift skill. Bij een nieuw Anthropic model, voer deze evals opnieuw uit om te controleren of de skill nog nodig is.'
            : '> ✅ **Workflow skill:** Deze evals testen of het vaste proces correct wordt gevolgd. Dit blijft relevant ongeacht modelversie.'}

---

## Test Cases
`;

    const testCases = evals.map((e, i) => {
        const typeEmoji = e.type === 'trigger' ? '🎯' : e.type === 'negative' ? '🚫' : '📊';
        return `### Test ${i + 1}: ${e.name}
**Type:** ${typeEmoji} ${e.type}

**Prompt:**
\`\`\`
${e.prompt}
\`\`\`

**Verwacht gedrag:** ${e.verwacht_gedrag}

**Criteria:**
${e.criteria.map(c => `- [ ] ${c}`).join('\n')}
`;
    }).join('\n---\n\n');

    const footer = `
---

## Resultaten

| Test | Met Skill | Zonder Skill | Verschil? |
|------|-----------|-------------|-----------|
${evals.map((e, i) => `| Test ${i + 1}: ${e.name} | ☐ Pass / ☐ Fail | ☐ Pass / ☐ Fail | ☐ Ja / ☐ Nee |`).join('\n')}

**Conclusie:** ☐ Skill behouden / ☐ Skill verwijderen / ☐ Skill aanpassen
`;

    return header + testCases + footer;
}

// ─── AI-powered Eval Generation ───────────────────────────────────────────

async function generateEvalsWithAI(
    specialistId: string,
    projectName: string,
    category: SkillCategory,
    skillContent: string,
    gsdAnswers: WizardAnswers,
): Promise<string | null> {
    try {
        const context = [
            `Project: ${gsdAnswers.projectName}`,
            `Framework: ${gsdAnswers.frontendFramework}`,
            `Database: ${gsdAnswers.database}`,
            `Deployment: ${gsdAnswers.deploymentTarget}`,
            `Skill categorie: ${category}`,
        ].join('\n');

        const message = await streamWithRetry({
            model: 'claude-sonnet-4-5-20250929',
            max_tokens: 3000,
            system: EVAL_GENERATOR_PROMPT,
            messages: [
                {
                    role: 'user',
                    content: `Genereer evals voor deze ${specialistId} skill (${category}):\n\n## Project Context\n${context}\n\n## Skill Inhoud\n${skillContent.slice(0, 2000)}`
                }
            ]
        });

        const content = message.content[0];
        if (content.type === 'text' && content.text.length > 100) {
            return content.text;
        }
    } catch (error) {
        console.error(`Eval generatie fout voor ${specialistId}:`, error);
    }

    return null;
}

// ─── Main Export ──────────────────────────────────────────────────────────

/**
 * Genereer eval test cases voor een skill.
 * Probeert AI-powered evals, valt terug op templates.
 */
export async function generateEvalForSkill(
    specialistId: string,
    skillContent: string,
    answers: WizardAnswer[],
    gsdAnswers: WizardAnswers,
): Promise<EvalFile | null> {
    // Bepaal categorie (uit answers of default)
    const specialistAnswers = answers.filter(a => a.specialist === specialistId && a.skillCategory);
    const category: SkillCategory = specialistAnswers.length > 0
        ? specialistAnswers[specialistAnswers.length - 1].skillCategory!
        : (specialistId === 'devops' || specialistId === 'integration') ? 'workflow' : 'capability_uplift';

    const projectName = gsdAnswers.projectName;

    // Bepaal het pad: skill is .claude/skills/X.md → eval wordt .claude/skills/X.evals.md
    const skillPath = `.claude/skills/${specialistId}.md`;
    const evalPath = skillPath.replace('.md', '.evals.md');

    // Probeer AI-powered evals
    const aiContent = await generateEvalsWithAI(
        specialistId,
        projectName,
        category,
        skillContent,
        gsdAnswers,
    );

    if (aiContent) {
        // Wrap AI content in onze standaard header/footer
        const header = `# Eval Tests — ${specialistId} skill
> **Project:** ${projectName}
> **Skill categorie:** ${category === 'capability_uplift' ? 'Capability Uplift' : 'Workflow'}
> **Doel:** Valideer dat de ${specialistId} skill daadwerkelijk waarde toevoegt

## Hoe te gebruiken

1. **Met skill**: Voer elke test-prompt uit in Claude Code met de skill geïnstalleerd
2. **Zonder skill**: Verwijder/hernoem de skill en voer dezelfde prompt opnieuw uit
3. **Vergelijk**: Beoordeel beide resultaten op de genoemde criteria

${category === 'capability_uplift'
                ? '> ⚠️ **Let op:** Dit is een capability_uplift skill. Bij een nieuw Anthropic model, voer deze evals opnieuw uit.'
                : '> ✅ **Workflow skill:** Deze evals testen of het vaste proces correct wordt gevolgd.'}

---

`;
        return {
            path: evalPath,
            content: header + aiContent,
        };
    }

    // Fallback naar template-evals
    const fallbackEvals = generateFallbackEvals(specialistId, projectName, category);
    return {
        path: evalPath,
        content: evalsToMarkdown(specialistId, projectName, category, fallbackEvals),
    };
}
