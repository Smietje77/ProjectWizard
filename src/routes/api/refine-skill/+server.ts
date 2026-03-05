// src/routes/api/refine-skill/+server.ts
// Skills 2.0 — Fase D: Skill Refinement endpoint
// Ontvangt de huidige skill content + gebruikersfeedback en genereert een verfijnde versie.

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { streamWithRetry } from '$lib/server/anthropic-client';
import { sanitizedError } from '$lib/server/errors';
import { generateEvalForSkill } from '$lib/generators/eval-generator';
import type { WizardAnswer } from '$lib/types';
import type { WizardAnswers } from '$lib/types/gsd';
import { mapAnswersToGSD } from '$lib/generators/answer-mapper';

const REFINE_SKILL_PROMPT = `Je bent een expert in het verfijnen van Claude Code skills.

Je ontvangt:
1. De huidige versie van een skill
2. Feedback van de gebruiker over wat er verbeterd moet worden
3. Optioneel: de eval test results die aangeven waar de skill tekortschiet

Je taak:
- Verbeter de skill op basis van de feedback
- Behoud alles wat goed is aan de huidige versie
- Voeg ontbrekende informatie toe
- Maak instructies concreter waar nodig
- Behoud de YAML frontmatter (---) bovenaan EXACT zoals die is — verander die NIET
- Schrijf de volledige, verbeterde skill (niet alleen de wijzigingen)

Schrijf in het Nederlands tenzij de skill in het Engels is.`;

export const POST: RequestHandler = async ({ request }) => {
    try {
        const body = await request.json();
        const {
            specialistId,
            skillContent,
            feedback,
            answers,
            projectName,
            description,
            regenerateEvals
        } = body as {
            specialistId: string;
            skillContent: string;
            feedback: string;
            answers: WizardAnswer[];
            projectName: string;
            description: string;
            regenerateEvals?: boolean;
        };

        if (!specialistId || !skillContent || !feedback) {
            return json(
                { error: 'specialistId, skillContent en feedback zijn verplicht' },
                { status: 400 }
            );
        }

        // Genereer verbeterde skill via AI
        const message = await streamWithRetry({
            model: 'claude-sonnet-4-5-20250929',
            max_tokens: 4096,
            system: REFINE_SKILL_PROMPT,
            messages: [
                {
                    role: 'user',
                    content: `Verbeter deze ${specialistId} skill op basis van de feedback.

## Huidige Skill
${skillContent}

## Feedback van de gebruiker
${feedback}

Genereer de volledige verbeterde skill (inclusief alle secties).`
                }
            ]
        });

        const content = message.content[0];
        if (content.type !== 'text' || content.text.length < 50) {
            return json({ error: 'AI genereerde onvoldoende output' }, { status: 500 });
        }

        let refinedSkill = content.text;

        // Behoud de originele frontmatter als de AI die weggelaten heeft
        if (skillContent.trimStart().startsWith('---') && !refinedSkill.trimStart().startsWith('---')) {
            const secondDash = skillContent.indexOf('---', skillContent.indexOf('---') + 3);
            if (secondDash !== -1) {
                const frontmatter = skillContent.slice(0, secondDash + 3) + '\n\n';
                refinedSkill = frontmatter + refinedSkill;
            }
        }

        // Strip als AI dubbele frontmatter genereerde
        if (refinedSkill.trimStart().startsWith('---')) {
            const firstIdx = refinedSkill.indexOf('---');
            const secondIdx = refinedSkill.indexOf('---', firstIdx + 3);
            if (secondIdx !== -1) {
                // Check of er nóg een frontmatter block is (dubbel)
                const afterFirst = refinedSkill.slice(secondIdx + 3).trimStart();
                if (afterFirst.startsWith('---')) {
                    // Verwijder de eerste frontmatter (AI-gegenereerde), behoud de tweede (originele)
                    refinedSkill = afterFirst;
                }
            }
        }

        // Optioneel: regenereer evals voor de verfijnde skill
        let newEvalContent: string | null = null;
        if (regenerateEvals && answers && projectName) {
            try {
                const gsdAnswers = mapAnswersToGSD(answers, description || '', projectName);
                const evalFile = await generateEvalForSkill(
                    specialistId,
                    refinedSkill,
                    answers,
                    gsdAnswers
                );
                if (evalFile) {
                    newEvalContent = evalFile.content;
                }
            } catch (evalErr) {
                console.error('Eval regeneratie na refinement mislukt:', evalErr);
            }
        }

        return json({
            success: true,
            refinedSkill,
            newEvalContent,
            message: `${specialistId} skill is verfijnd op basis van je feedback.`
        });
    } catch (error) {
        return sanitizedError(error, 'Fout bij het verfijnen van de skill');
    }
};
