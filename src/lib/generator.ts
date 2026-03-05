import type { WizardAnswer } from '$lib/types';

export interface GenerationInput {
	projectName: string;
	description: string;
	answers: WizardAnswer[];
}

export interface GeneratedFile {
	path: string;
	content: string;
}

// Analyseer antwoorden om technische keuzes te extraheren
function extractChoices(answers: WizardAnswer[]): Record<string, string> {
	const choices: Record<string, string> = {};
	for (const a of answers) {
		const key = a.specialist + '_' + a.step;
		choices[key] = a.answer;
	}
	return choices;
}

// Zoek een antwoord op basis van keyword in de vraag
function findAnswer(answers: WizardAnswer[], keyword: string): string | undefined {
	const match = answers.find(
		(a) =>
			a.question.toLowerCase().includes(keyword.toLowerCase()) ||
			a.answer.toLowerCase().includes(keyword.toLowerCase())
	);
	return match?.answer;
}

// Detecteer welke MCPs nodig zijn op basis van antwoorden
function detectMcps(answers: WizardAnswer[]): Record<string, object> {
	const mcps: Record<string, object> = {};
	const allText = answers.map((a) => `${a.question} ${a.answer}`).join(' ').toLowerCase();

	// Supabase is bijna altijd nodig
	if (allText.includes('supabase') || allText.includes('database')) {
		mcps['supabase'] = {
			command: 'npx',
			args: ['-y', '@supabase/mcp-server'],
			env: {
				SUPABASE_URL: '${SUPABASE_URL}',
				SUPABASE_SERVICE_ROLE_KEY: '${SUPABASE_SERVICE_ROLE_KEY}'
			}
		};
	}

	// Filesystem voor project generatie
	mcps['filesystem'] = {
		command: 'npx',
		args: ['-y', '@anthropic/mcp-filesystem'],
		env: {
			ALLOWED_PATHS: 'C:\\claude_projects'
		}
	};

	// GitHub als het genoemd wordt
	if (allText.includes('github')) {
		mcps['github'] = {
			command: 'npx',
			args: ['-y', '@anthropic/mcp-github']
		};
	}

	return mcps;
}

// Type voor env variabelen met service-groepering
export interface DetectedEnvVar {
	key: string;
	comment: string;
	example: string;
	service: string;
	dashboardLink?: string;
	sensitive: boolean;
	label?: string;
	format?: string;
}

// Detecteer welke env variabelen nodig zijn (met service-groepering)
function detectEnvVarsGrouped(answers: WizardAnswer[]): DetectedEnvVar[] {
	const vars: DetectedEnvVar[] = [];
	const allText = answers.map((a) => `${a.question} ${a.answer}`).join(' ').toLowerCase();

	if (allText.includes('supabase') || allText.includes('database')) {
		vars.push(
			{ key: 'SUPABASE_URL', comment: 'Supabase instance URL', example: 'http://your-supabase-host:8000', service: 'Supabase', dashboardLink: 'https://supabase.com/dashboard', sensitive: false },
			{ key: 'SUPABASE_ANON_KEY', label: 'SUPABASE PUBLISHABLE KEY', comment: 'Publishable key (Settings → API Keys → Publishable)', example: 'sb_publishable_...', service: 'Supabase', sensitive: true },
			{ key: 'SUPABASE_SERVICE_ROLE_KEY', label: 'SUPABASE SECRET KEY', comment: 'Secret key — GEHEIM (Settings → API Keys → Secret)', example: 'sb_secret_...', service: 'Supabase', sensitive: true }
		);
	}

	if (allText.includes('ai') || allText.includes('claude') || allText.includes('anthropic') || allText.includes('api')) {
		vars.push({
			key: 'ANTHROPIC_API_KEY', comment: 'Claude API key', example: 'sk-ant-api03-...', service: 'Anthropic', dashboardLink: 'https://console.anthropic.com/settings/keys', sensitive: true, format: '^sk-ant-'
		});
	}

	if (allText.includes('stripe') || allText.includes('betaling') || allText.includes('abonnement')) {
		vars.push(
			{ key: 'STRIPE_SECRET_KEY', comment: 'Stripe secret key', example: 'sk_test_...', service: 'Stripe', dashboardLink: 'https://dashboard.stripe.com/apikeys', sensitive: true, format: '^sk_' },
			{ key: 'STRIPE_PUBLISHABLE_KEY', comment: 'Stripe publishable key', example: 'pk_test_...', service: 'Stripe', sensitive: false, format: '^pk_' },
			{ key: 'STRIPE_WEBHOOK_SECRET', comment: 'Stripe webhook signing secret', example: 'whsec_...', service: 'Stripe', sensitive: true, format: '^whsec_' }
		);
	}

	if (allText.includes('resend') || allText.includes('email')) {
		vars.push({
			key: 'RESEND_API_KEY', comment: 'Resend API key voor email', example: 're_...', service: 'Resend', dashboardLink: 'https://resend.com/api-keys', sensitive: true, format: '^re_'
		});
	}

	if (allText.includes('openai')) {
		vars.push({
			key: 'OPENAI_API_KEY', comment: 'OpenAI API key', example: 'sk-...', service: 'OpenAI', dashboardLink: 'https://platform.openai.com/api-keys', sensitive: true, format: '^sk-'
		});
	}

	if (allText.includes('github') && (allText.includes('mcp') || allText.includes('repository'))) {
		vars.push({
			key: 'GITHUB_PERSONAL_ACCESS_TOKEN', comment: 'GitHub personal access token', example: 'ghp_...', service: 'GitHub', dashboardLink: 'https://github.com/settings/tokens', sensitive: true, format: '^ghp_'
		});
	}

	return vars;
}

// Publiek beschikbare functie voor API response
export function detectRequiredEnvVars(answers: WizardAnswer[]): DetectedEnvVar[] {
	return detectEnvVarsGrouped(answers);
}

// Detecteer welke env variabelen nodig zijn (plat formaat voor .env.example)
function detectEnvVars(answers: WizardAnswer[]): Array<{ key: string; comment: string; example: string }> {
	const grouped = detectEnvVarsGrouped(answers);
	const vars = grouped.map(({ key, comment, example }) => ({ key, comment, example }));

	// Voeg altijd de standaard vars toe (niet service-specifiek)
	vars.push(
		{ key: 'PUBLIC_APP_NAME', comment: 'Applicatie naam', example: 'MijnApp' },
		{ key: 'PUBLIC_DEFAULT_LANGUAGE', comment: 'Standaard taal', example: 'nl' },
		{ key: 'NODE_ENV', comment: 'Environment', example: 'development' }
	);

	return vars;
}

// Genereer CLAUDE.md content
export function generateClaudeMd(input: GenerationInput): string {
	const { projectName, description, answers } = input;
	const frontend = findAnswer(answers, 'frontend') ?? 'SvelteKit';
	const database = findAnswer(answers, 'database') ?? 'Supabase';
	const deployment = findAnswer(answers, 'deploy') ?? 'Dokploy';

	const answersSummary = answers
		.map((a) => `- **${a.question}**: ${a.answer}`)
		.join('\n');

	return `# ${projectName}

## Project Overzicht
${description}

## Tech Stack
- **Frontend**: ${frontend}
- **Database**: ${database}
- **Deployment**: ${deployment}
- **Taal**: TypeScript

## Bash Commands
\`\`\`bash
npm install          # Installeer dependencies
npm run dev          # Start development server
npm run build        # Production build
npm run preview      # Preview production build
\`\`\`

## Architectuur

### Beslissingen
${answersSummary}

## Code Conventies
- TypeScript strict mode
- Nederlandse comments voor business logic
- Engelse code/variabelen

## Denk-instructies
Pas uitgebreid redeneren toe bij:
- **Architectuurbeslissingen** — keuzes die de structuur van het project beïnvloeden
- **Database schema's** — relaties, indexen, migraties
- **Security-gerelateerde code** — authenticatie, autorisatie, input-validatie
- **Complexe business logic** — edge cases, foutafhandeling, data-integriteit

Bij simpele UI-aanpassingen, tekst-wijzigingen of configuratie is kort nadenken voldoende.

## Omgevingsvariabelen
Zie \`.env.example\` voor alle benodigde variabelen.
`;
}

// Genereer PROMPT.md content
export function generatePromptMd(input: GenerationInput): string {
	const { projectName, description, answers } = input;

	const requirements = answers
		.filter((a) => a.specialist === 'requirements')
		.map((a) => `- ${a.answer}`)
		.join('\n');

	const techAnswers = answers
		.filter((a) => ['architect', 'frontend', 'backend', 'devops'].includes(a.specialist))
		.map((a) => `- **${a.question}**: ${a.answer}`)
		.join('\n');

	return `# ${projectName} — Startprompt voor Claude Code

## Wat is dit project?
${description}

## Requirements
${requirements || '- Zie wizard antwoorden'}

## Technische Keuzes
${techAnswers || '- Zie wizard antwoorden'}

## Implementatie Fasen

### Phase 1: Foundation
Project setup, database schema, authenticatie, basis layout en navigatie.

### Phase 2: Core Backend
API endpoints, data models en validatie, error handling.

### Phase 3: Core Frontend
Hoofd UI componenten, formulieren, loading en error states.

### Phase 4: Features & Integraties
Secundaire features en externe service koppelingen.

### Phase 5: Polish & Testing
Testing, performance optimalisatie, responsive fixes.

### Phase 6: Deployment
Production deployment, environment configuratie, SSL, health checks.

## Kwaliteitscriteria
- [ ] Alle kernfunctionaliteiten werken
- [ ] Database schema is correct
- [ ] Authenticatie is veilig
- [ ] UI is bruikbaar en responsief
- [ ] Deployment configuratie is compleet

## Agent Teams

Dit project kan gebouwd worden met Claude Code Agent Teams voor snellere en betere resultaten.

### Setup
1. Zorg dat \`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1\` in je environment staat
2. Bekijk \`TEAM.md\` voor de volledige team configuratie

### Werkwijze
- Start Claude Code als **lead** (coordinator) — deze delegeert taken, bouwt niet zelf
- Gebruik **Shift+Tab** om in delegate mode te gaan en teammates te spawnen
- Elke teammate werkt aan eigen bestanden om file conflicts te voorkomen
- Check voortgang met **Shift+Up/Down**

### Snel starten
Geef de lead deze instructie:
\`\`\`
Lees TEAM.md en maak een agent team aan. Start met Fase 1: Foundation.
\`\`\`

## Start hier
Begin met \`npm install\` en volg de setup instructies in CLAUDE.md.
`;
}

// Genereer .mcp.json
export function generateMcpJson(answers: WizardAnswer[]): string {
	const mcps = detectMcps(answers);
	return JSON.stringify({ mcpServers: mcps }, null, 2) + '\n';
}

// Genereer .env.example
export function generateEnvExample(answers: WizardAnswer[]): string {
	const vars = detectEnvVars(answers);
	const lines = ['# Environment Variables', '# Kopieer naar .env.local en vul de waardes in', ''];

	// Claude Code Agent Teams (altijd bovenaan)
	lines.push('# Claude Code Agent Teams (experimenteel)');
	lines.push('CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1');
	lines.push('');

	for (const v of vars) {
		lines.push(`# ${v.comment}`);
		lines.push(`${v.key}=${v.example}`);
		lines.push('');
	}

	return lines.join('\n');
}

// Genereer .gitignore — framework-specifiek
export function generateGitignore(framework?: string): string {
	const common = `node_modules/
build/
dist/
.env
.env.local
.env.production
.DS_Store
*.log`;

	const frameworkIgnores: Record<string, string> = {
		sveltekit: '.svelte-kit/',
		nextjs: `.next/
out/
next-env.d.ts`,
		nuxt: `.nuxt/
.output/`
	};

	const specific = frameworkIgnores[framework || 'sveltekit'] || frameworkIgnores['sveltekit'];
	return `${common}\n${specific}\n`;
}

// Genereer design skill (.claude/skills/design.md)
// Gebaseerd op de Anthropic frontend-design skill, aangevuld met projectspecifieke keuzes
export function generateDesignSkill(answers: WizardAnswer[]): string {
	const designAnswers = answers.filter((a) => a.specialist === 'design' && a.type !== 'skipped');

	// Extraheer screenshot analyses (multi-page support)
	let screenshotSection = '';
	const screenshotMarkers: Array<{ pageType: string; text: string }> = [];
	for (const a of designAnswers) {
		// Nieuw multi-page formaat: [DESIGN_ANALYSE:pageType]
		const multiRegex = /\[DESIGN_ANALYSE:([^\]]+)\]\n/g;
		let match;
		const markers: Array<{ pageType: string; startIdx: number }> = [];
		while ((match = multiRegex.exec(a.answer)) !== null) {
			markers.push({ pageType: match[1], startIdx: match.index + match[0].length });
		}
		if (markers.length > 0) {
			for (let i = 0; i < markers.length; i++) {
				const start = markers[i].startIdx;
				const end = i + 1 < markers.length ? markers[i + 1].startIdx - markers[i + 1].pageType.length - '[DESIGN_ANALYSE:]\n'.length : a.answer.length;
				screenshotMarkers.push({ pageType: markers[i].pageType, text: a.answer.slice(start, end).trim() });
			}
		} else if (a.answer.includes('[DESIGN_ANALYSE]')) {
			// Backward-compatible: oud formaat
			const oldMarker = '[DESIGN_ANALYSE]\n';
			const idx = a.answer.indexOf(oldMarker);
			if (idx >= 0) {
				screenshotMarkers.push({ pageType: 'Algemeen', text: a.answer.slice(idx + oldMarker.length).trim() });
			}
		}
	}
	if (screenshotMarkers.length > 0) {
		const sections = screenshotMarkers
			.map((m) => `### ${m.pageType}\n\`\`\`\n${m.text}\n\`\`\``)
			.join('\n\n');
		screenshotSection = `
## Design Referenties (van screenshots)
De gebruiker heeft screenshots als inspiratie opgegeven. Gebruik onderstaande analyses als primaire design referenties per pagina-type:

${sections}

Volg de specifieke kleuren, typografie en componentstijl per pagina-type zo nauwkeurig mogelijk.
`;
	}

	// Detecteer design keuzes uit antwoorden
	const allDesignText = designAnswers.map((a) => a.answer).join(' ').toLowerCase();

	let designStyle = 'minimalistisch';
	if (allDesignText.includes('zakelijk') || allDesignText.includes('professioneel'))
		designStyle = 'zakelijk';
	if (allDesignText.includes('speels') || allDesignText.includes('creatief'))
		designStyle = 'speels';
	if (allDesignText.includes('brutalistisch')) designStyle = 'brutalistisch';

	let colorScheme = 'light';
	if (allDesignText.includes('donker') || allDesignText.includes('dark')) colorScheme = 'dark';
	if (allDesignText.includes('beide') || allDesignText.includes('auto')) colorScheme = 'auto';

	let typo = 'Modern sans-serif';
	if (allDesignText.includes('serif') && !allDesignText.includes('sans'))
		typo = 'Klassiek serif';
	if (allDesignText.includes('mono')) typo = 'Monospaced/tech';
	if (allDesignText.includes('combinatie') || allDesignText.includes('mixed'))
		typo = 'Mixed (display + body)';

	let compStyle = 'rounded';
	if (allDesignText.includes('scherp') || allDesignText.includes('sharp')) compStyle = 'sharp';
	if (allDesignText.includes('glass')) compStyle = 'glassmorphism';
	if (allDesignText.includes('neumorf')) compStyle = 'neumorphic';

	// Detecteer framework context
	const allText = answers
		.map((a) => `${a.question} ${a.answer}`)
		.join(' ')
		.toLowerCase();
	const framework = allText.includes('next')
		? 'Next.js'
		: allText.includes('vue') || allText.includes('nuxt')
			? 'Nuxt/Vue'
			: allText.includes('svelte')
				? 'SvelteKit'
				: 'het gekozen framework';
	const uiLib = allText.includes('skeleton')
		? 'Skeleton UI'
		: allText.includes('shadcn')
			? 'shadcn/ui'
			: allText.includes('daisy')
				? 'DaisyUI'
				: 'Tailwind CSS';

	const today = new Date().toISOString().split('T')[0];

	return `---
name: design
description: Projectspecifiek design systeem. Gebruik /design bij elke UI-taak voor consistente, unieke styling. Gebaseerd op de Anthropic frontend-design skill.
category: workflow
created: ${today}
review_after_model_update: false
# Workflow skill: design voorkeuren blijven relevant ongeacht modelversie
---

# Design Skill

Dit bestand definieert het volledige design systeem voor dit project.
Volg deze richtlijnen bij ELKE UI component die je bouwt.

## Design Thinking

Voordat je code schrijft, begrijp de context en commit aan een DUIDELIJKE esthetische richting:
- **Doel**: Wat lost deze interface op? Wie gebruikt het?
- **Toon**: ${designStyle} — voer dit consequent door in elk component
- **Framework**: ${framework} met ${uiLib}
- **Differentiatie**: Wat maakt dit ontwerp ONVERGETELIJK?

**KRITISCH**: Kies een duidelijke conceptuele richting en voer die uit met precisie. De sleutel is intentionaliteit, niet intensiteit.

## Projectspecifieke Richting

### Stijl
**Gekozen stijl**: ${designStyle}
${designStyle === 'minimalistisch' ? '- Clean interfaces, veel witruimte, focus op content\n- Subtiele hover states en transities\n- Minder is meer — elk element moet een doel hebben' : ''}${designStyle === 'zakelijk' ? '- Strakke lijnen, betrouwbare uitstraling\n- Professionele kleurkeuzes, geen onnodige decoratie\n- Data-first benadering bij dashboards' : ''}${designStyle === 'speels' ? '- Kleurrijke accenten, dynamische elementen\n- Verrassende micro-interacties\n- Persoonlijkheid in elke component' : ''}${designStyle === 'brutalistisch' ? '- Bold typografie, onconventionele layouts\n- Rauwe, eerlijke esthetiek\n- Opvallende contrasten en onverwachte keuzes' : ''}

### Kleurenpalet
**Schema**: ${colorScheme} mode
${colorScheme === 'dark' ? '- Gebruik donkere achtergronden als basis\n- Lichte tekst met voldoende contrast (WCAG AA)\n- Subtiele surface-variaties voor diepte' : ''}${colorScheme === 'light' ? '- Lichte achtergronden als basis\n- Donkere tekst voor leesbaarheid\n- Kleuraccenten voor interactieve elementen' : ''}${colorScheme === 'auto' ? '- Ondersteun zowel light als dark mode\n- Gebruik CSS variabelen voor thema-switching\n- Test beide themas bij elk component' : ''}

### Typografie
**Stijl**: ${typo}
- Kies fonts die mooi, uniek en interessant zijn
- Vermijd generieke fonts zoals Arial, Inter, Roboto en system fonts
- Koppel een distinctief display font met een verfijnd body font
- Headings: font-bold, tracking-tight
- Body: font-normal, leading-relaxed

### Component Stijl
**Vorm**: ${compStyle}
${compStyle === 'rounded' ? '- border-radius: rounded-lg tot rounded-xl\n- Zachte schaduwen (shadow-sm tot shadow-md)\n- Vloeiende transities' : ''}${compStyle === 'sharp' ? '- border-radius: rounded-none of rounded-sm\n- Minimale of geen schaduwen\n- Scherpe randen, strakke lijnen' : ''}${compStyle === 'glassmorphism' ? '- backdrop-blur en transparantie\n- Subtiele borders met lage opacity\n- Gelaagdheid en diepte via blur-effecten' : ''}${compStyle === 'neumorphic' ? '- Zachte inset en outset schaduwen\n- Subtiele 3D-diepte\n- Monochrome kleurpaletten met minimale variatie' : ''}
${screenshotSection}
## Frontend Aesthetics Guidelines

### Kleur & Thema
Commit aan een cohesieve esthetiek. Gebruik CSS variabelen voor consistentie.
Dominante kleuren met scherpe accenten presteren beter dan timide, gelijk-verdeelde paletten.

### Motion & Animatie
Gebruik animaties voor effecten en micro-interacties. Focus op high-impact momenten:
een goed-georkestreerde page load met staggered reveals creert meer vreugde dan verspreide micro-interacties.
Gebruik scroll-triggering en hover states die verrassen.

### Spatial Composition
Onverwachte layouts. Asymmetrie. Overlap. Diagonale flow. Grid-brekende elementen.
Royale negative space OF gecontroleerde dichtheid — afhankelijk van de gekozen stijl.

### Achtergronden & Visuele Details
Creeer atmosfeer en diepte in plaats van standaard effen kleuren.
Pas creatieve vormen toe: gradient meshes, noise textures, geometrische patronen,
gelaagde transparanties, dramatische schaduwen, decoratieve borders.

## Wat NIET te doen

NOOIT generieke AI-esthetiek gebruiken:
- Overgebruikte font families (Inter, Roboto, Arial, system fonts)
- Cliche kleurschemas (vooral paarse gradienten op witte achtergronden)
- Voorspelbare layouts en component patronen
- Cookie-cutter design zonder context-specifiek karakter
${colorScheme === 'dark' ? '- GEEN lichte achtergronden als basis (dit is een dark mode project)' : ''}${colorScheme === 'light' ? '- GEEN donkere achtergronden als basis (dit is een light mode project)' : ''}

Interpreteer creatief en maak onverwachte keuzes die echt ontworpen aanvoelen voor de context.
Geen enkel design mag hetzelfde zijn.

## Implementatie

Match implementatiecomplexiteit aan de esthetische visie:
- Maximalistische designs hebben uitgebreide code nodig met animaties en effecten
- Minimalistische designs vereisen terughoudendheid, precisie en aandacht voor spacing en typografie
- Elegantie komt van het goed uitvoeren van de visie

Onthoud: Claude is in staat tot buitengewoon creatief werk. Houd je niet in.
`;
}

// Genereer alle project bestanden
export function generateProjectFiles(input: GenerationInput): GeneratedFile[] {
	const files: GeneratedFile[] = [];

	files.push({ path: 'CLAUDE.md', content: generateClaudeMd(input) });
	files.push({ path: 'PROMPT.md', content: generatePromptMd(input) });
	files.push({ path: '.mcp.json', content: generateMcpJson(input.answers) });
	files.push({ path: '.env.example', content: generateEnvExample(input.answers) });
	const frameworkAnswer = (findAnswer(input.answers, 'frontend') || findAnswer(input.answers, 'framework') || '').toLowerCase();
	const detectedFramework = frameworkAnswer.includes('next') ? 'nextjs'
		: frameworkAnswer.includes('nuxt') ? 'nuxt'
			: 'sveltekit';
	files.push({ path: '.gitignore', content: generateGitignore(detectedFramework) });

	return files;
}

export { detectMcps, detectEnvVars, extractChoices, findAnswer };
