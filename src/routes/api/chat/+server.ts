import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import Anthropic from '@anthropic-ai/sdk';
import { env } from '$env/dynamic/private';

function getClient() {
	return new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
}

const COORDINATOR_SYSTEM = `Je bent de Coordinator van ProjectWizard — een AI-wizard die niet-technische gebruikers begeleidt bij het opzetten van software projecten.

Je taak:
1. Analyseer de projectbeschrijving en eerder gegeven antwoorden
2. Bepaal welke specialist de volgende vraag moet stellen
3. Stel een duidelijke vraag (Nederlands)
4. Geef concreet advies met uitleg

Specialists: requirements, architect, frontend, backend, devops, integration, testing, design

Vereiste categorieën (alle moeten aan bod komen):
- project_doel: Wat wil de gebruiker bouwen?
- doelgroep: Voor wie is het?
- kernfunctionaliteiten: Welke features?
- frontend_keuze: Welk framework/library?
- database_keuze: Welke database?
- auth_keuze: Welke authenticatie?
- deployment_keuze: Hoe deployen?
- design_stijl: Welke visuele stijl en design keuzes?

Regels:
- Vraag één ding tegelijk
- Bied altijd concrete opties bij multiple choice
- Bij multiple_choice: gebruik max_selecties om aan te geven hoeveel opties de gebruiker mag kiezen. Standaard is 1 (enkele keuze). Gebruik een hoger getal als de vraag om meerdere keuzes vraagt (bijv. "Kies de 3 belangrijkste" → max_selecties: 3).
- Geef advies met reden
- Houd het simpel voor niet-technische gebruikers
- Antwoord ALTIJD in het Nederlands
- Als de gebruiker een vraag stelt (tekst begint met "[VRAAG]"), beantwoord die dan uitgebreid in het "advies" veld, geef context in "advies_reden", en stel daarna een nieuwe relevante vraag in het "vraag" veld.
- Als een gebruiker een vraag overslaat (antwoord bevat "[OVERGESLAGEN]"), ga door naar een ander onderwerp. Stel later eventueel een gerelateerde vraag op een andere manier.
- Zet "categorie" op de vereiste categorie die DEZE vraag gaat beantwoorden (null als het een verdiepende vraag is die geen categorie direct afdekt)
- Wees efficiënt: als het antwoord van de gebruiker meerdere categorieën tegelijk afdekt (bijv. projectbeschrijving bevat al doelgroep en doel), sla die categorieën dan over
- BELANGRIJK: Analyseer ALTIJD de inhoud van alle eerder gegeven antwoorden om te bepalen welke categorieën al afgedekt zijn. Vertrouw NIET alleen op de "reeds_afgevinkt" lijst — die kan leeg zijn bij oudere sessies. Als de antwoorden duidelijk informatie bevatten over een categorie (bijv. een antwoord over "React" dekt frontend_keuze af), beschouw die categorie dan als afgedekt.
- Als alle categorieën afgedekt zijn (uit antwoorden OF uit de "reeds_afgevinkt" lijst), of als je genoeg informatie hebt om een werkend project te genereren, zet is_compleet op true. Je hoeft NIET alle 50 vragen te gebruiken.

Antwoord ALTIJD in dit JSON formaat (geen extra tekst):
{
  "volgende_specialist": "specialist_naam",
  "vraag": "De vraag in het Nederlands",
  "vraag_type": "multiple_choice" of "vrije_tekst",
  "opties": ["optie1", "optie2", "optie3"],
  "max_selecties": 1,
  "categorie": "vereiste_categorie_die_deze_vraag_beantwoordt_of_null",
  "advies": "Concreet advies",
  "advies_reden": "Waarom dit advies",
  "is_compleet": false
}`;

export const POST: RequestHandler = async ({ request }) => {
	const { projectDescription, answers, currentStep, completedCategories, userAnswer } = await request.json();

	const messages: Anthropic.MessageParam[] = [
		{
			role: 'user',
			content: `Projectbeschrijving: "${projectDescription}"

Eerder beantwoorde vragen (${answers?.length ?? 0}):
${answers?.map((a: { question: string; answer: string; specialist: string; type?: string }, i: number) => `${i + 1}. [${a.specialist}] ${a.question} → ${a.type === 'skipped' ? '[OVERGESLAGEN]' : a.answer}`).join('\n') || 'Nog geen antwoorden.'}

Reeds afgevinkte categorieën: ${completedCategories?.length ? completedCategories.join(', ') : 'Nog geen'}

Huidige stap: ${currentStep}
${userAnswer ? `Laatste antwoord/actie: ${userAnswer}` : 'Dit is de eerste vraag.'}

Bepaal de volgende vraag. Antwoord ALLEEN in JSON formaat.`
		}
	];

	try {
		// Stream de response voor snellere feedback
		const stream = await getClient().messages.stream({
			model: 'claude-sonnet-4-5-20250929',
			max_tokens: 1024,
			system: COORDINATOR_SYSTEM,
			messages
		});

		const message = await stream.finalMessage();
		const content = message.content[0];
		if (content.type !== 'text') {
			throw new Error('Onverwacht response type');
		}

		const jsonMatch = content.text.match(/\{[\s\S]*\}/);
		if (!jsonMatch) {
			throw new Error('Geen JSON gevonden in response');
		}

		const data = JSON.parse(jsonMatch[0]);
		return json(data);
	} catch (error) {
		console.error('Coordinator API fout:', error);
		const message = error instanceof Error ? error.message : 'Onbekende fout';
		return json({ error: `Fout bij het ophalen van de volgende vraag: ${message}` }, { status: 500 });
	}
};
