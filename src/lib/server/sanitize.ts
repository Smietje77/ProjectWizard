// Input sanitization voor prompt injection preventie
// Beschermt tegen bekende prompt injection patronen en XML tag verwarring

// Bekende prompt injection patronen (case-insensitive)
const INJECTION_PATTERNS = [
	/ignore\s+(all\s+)?previous\s+instructions/i,
	/negeer\s+(alle\s+)?vorige\s+(instructies|opdrachten)/i,
	/disregard\s+(all\s+)?prior\s+(instructions|directives)/i,
	/forget\s+(everything|all)\s+(above|before)/i,
	/you\s+are\s+now\s+(a|an)\s+/i,
	/je\s+bent\s+nu\s+(een)\s+/i,
	/system\s*:\s*/i,
	/\[INST\]/i,
	/<<\s*SYS\s*>>/i
];

// Maximale lengtes per veld
export const MAX_LENGTHS = {
	projectDescription: 5000,
	answer: 2000,
	documentContext: 40000
} as const;

/**
 * Sanitize tekst voor gebruik in prompts.
 * - Strip bekende injection patronen
 * - Escape XML-achtige tags
 * - Beperk lengte
 *
 * Retourneert { text, wasModified } zodat caller kan loggen.
 */
export function sanitizePromptInput(
	text: string,
	maxLength: number
): { text: string; wasModified: boolean } {
	if (!text) return { text: '', wasModified: false };

	let modified = false;
	let result = text;

	// 1. Lengte beperken
	if (result.length > maxLength) {
		result = result.slice(0, maxLength);
		modified = true;
	}

	// 2. Bekende injection patronen markeren (niet verwijderen — dat maakt debugging moeilijk)
	for (const pattern of INJECTION_PATTERNS) {
		if (pattern.test(result)) {
			result = result.replace(pattern, '[GEFILTERD]');
			modified = true;
		}
	}

	// 3. Escape XML-achtige tags die Claude's parsing kunnen verwarren
	// Specifiek: <system>, <human>, <assistant>, <tool>, <function>
	result = result.replace(/<\/?(?:system|human|assistant|tool|function)(?:\s[^>]*)?>/gi, (match) => {
		modified = true;
		return match.replace(/</g, '&lt;').replace(/>/g, '&gt;');
	});

	return { text: result, wasModified: modified };
}
