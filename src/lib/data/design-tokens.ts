/**
 * Gecureerde design data voor de design skill generator.
 * Bronnen: Tailwind CSS, Radix Colors, UIverse.io, Google Fonts.
 * Geen externe dependencies — alles statisch.
 */

export interface ColorPalette {
	primary: string;
	secondary: string;
	accent: string;
	background: string;
	surface: string;
	text: string;
	textMuted: string;
	border: string;
	darkBackground: string;
	darkSurface: string;
}

export interface EffectArchetype {
	card: string;
	button: string;
	input?: string;
	container?: string;
	overlay?: string;
	badge?: string;
}

export interface FontPairing {
	heading: string;
	body: string;
	mono: string;
	googleFontsUrl: string;
	tailwindConfig: string;
}

export interface SpecialEffect {
	name: string;
	tailwind?: string;
	wrapper?: string;
	inner?: string;
	css?: string;
	description: string;
}

// ---------------------------------------------------------------------------
// Kleurpaletten per designStyle
// Gebruikt als fallback als geen screenshot-kleuren beschikbaar zijn.
// ---------------------------------------------------------------------------
export const COLOR_PALETTES: Record<string, ColorPalette> = {
	minimalistisch: {
		primary: '#1a1a2e',
		secondary: '#6b7280',
		accent: '#3b82f6',
		background: '#ffffff',
		surface: '#f8fafc',
		text: '#0f172a',
		textMuted: '#64748b',
		border: '#e2e8f0',
		darkBackground: '#0f172a',
		darkSurface: '#1e293b'
	},
	zakelijk: {
		primary: '#1e40af',
		secondary: '#475569',
		accent: '#0284c7',
		background: '#f8fafc',
		surface: '#ffffff',
		text: '#1e293b',
		textMuted: '#64748b',
		border: '#cbd5e1',
		darkBackground: '#0f172a',
		darkSurface: '#1e293b'
	},
	speels: {
		primary: '#7c3aed',
		secondary: '#db2777',
		accent: '#f59e0b',
		background: '#fafafa',
		surface: '#f5f3ff',
		text: '#1f2937',
		textMuted: '#6b7280',
		border: '#ddd6fe',
		darkBackground: '#1a0533',
		darkSurface: '#2d1057'
	},
	brutalistisch: {
		primary: '#000000',
		secondary: '#1a1a1a',
		accent: '#facc15',
		background: '#ffffff',
		surface: '#f5f5f5',
		text: '#000000',
		textMuted: '#374151',
		border: '#000000',
		darkBackground: '#000000',
		darkSurface: '#111111'
	},
	// custom → zakelijk als neutrale basis
	custom: {
		primary: '#1e40af',
		secondary: '#475569',
		accent: '#0284c7',
		background: '#f8fafc',
		surface: '#ffffff',
		text: '#1e293b',
		textMuted: '#64748b',
		border: '#cbd5e1',
		darkBackground: '#0f172a',
		darkSurface: '#1e293b'
	}
};

// ---------------------------------------------------------------------------
// Effect archetypes per componentStyle — concrete Tailwind-klassen
// Gebaseerd op UIverse.io patronen (MIT) en gangbare Tailwind-conventies.
// ---------------------------------------------------------------------------
export const EFFECT_ARCHETYPES: Record<string, EffectArchetype> = {
	glassmorphism: {
		card: 'bg-white/10 backdrop-blur-md border border-white/20 shadow-xl',
		button: 'bg-white/20 backdrop-blur-sm border border-white/30 hover:bg-white/30 transition-all',
		input: 'bg-white/10 backdrop-blur-sm border border-white/20 focus:border-white/40 focus:bg-white/15',
		container: 'bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-lg',
		overlay: 'bg-black/30 backdrop-blur-sm'
	},
	neumorphic: {
		card: 'bg-[#e0e5ec] shadow-[6px_6px_12px_#b8bec7,-6px_-6px_12px_#ffffff] rounded-2xl',
		button:
			'bg-[#e0e5ec] shadow-[4px_4px_8px_#b8bec7,-4px_-4px_8px_#ffffff] active:shadow-[inset_4px_4px_8px_#b8bec7,inset_-4px_-4px_8px_#ffffff] rounded-xl transition-all',
		input:
			'shadow-[inset_4px_4px_8px_#b8bec7,inset_-4px_-4px_8px_#ffffff] bg-[#e0e5ec] rounded-xl border-none',
		container: 'bg-[#e0e5ec]'
	},
	sharp: {
		card: 'border-2 border-black shadow-[4px_4px_0px_#000] rounded-none bg-white',
		button:
			'border-2 border-black shadow-[3px_3px_0px_#000] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all rounded-none font-bold',
		input: 'border-2 border-black rounded-none focus:shadow-[3px_3px_0px_#000] transition-all',
		badge: 'border-2 border-black bg-yellow-300 px-2 py-0.5 font-bold rounded-none text-black'
	},
	rounded: {
		card: 'rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow bg-white',
		button: 'rounded-full shadow-sm hover:shadow-md transition-all px-6',
		input: 'rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100',
		badge: 'rounded-full px-3 py-1 text-sm font-medium',
		container: 'rounded-3xl'
	}
};

// ---------------------------------------------------------------------------
// Font-pairings per designStyle
// Gebaseerd op Typewolf top-40, Fontshare en Google Fonts categorieën.
// ---------------------------------------------------------------------------
export const FONT_PAIRINGS: Record<string, FontPairing> = {
	minimalistisch: {
		heading: 'Inter',
		body: 'Inter',
		mono: 'JetBrains Mono',
		googleFontsUrl:
			'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap',
		tailwindConfig: `fontFamily: {
      sans: ['Inter', 'sans-serif'],
      mono: ['JetBrains Mono', 'monospace'],
    }`
	},
	zakelijk: {
		heading: 'Plus Jakarta Sans',
		body: 'Inter',
		mono: 'Fira Code',
		googleFontsUrl:
			'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Inter:wght@400;500;600&family=Fira+Code:wght@400;500&display=swap',
		tailwindConfig: `fontFamily: {
      display: ['Plus Jakarta Sans', 'sans-serif'],
      sans: ['Inter', 'sans-serif'],
      mono: ['Fira Code', 'monospace'],
    }`
	},
	speels: {
		heading: 'Nunito',
		body: 'Nunito Sans',
		mono: 'Space Mono',
		googleFontsUrl:
			'https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&family=Nunito+Sans:wght@400;500;600&family=Space+Mono:wght@400;700&display=swap',
		tailwindConfig: `fontFamily: {
      display: ['Nunito', 'sans-serif'],
      sans: ['Nunito Sans', 'sans-serif'],
      mono: ['Space Mono', 'monospace'],
    }`
	},
	brutalistisch: {
		heading: 'Space Grotesk',
		body: 'Space Mono',
		mono: 'Space Mono',
		googleFontsUrl:
			'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Space+Mono:wght@400;700&display=swap',
		tailwindConfig: `fontFamily: {
      display: ['Space Grotesk', 'sans-serif'],
      sans: ['Space Grotesk', 'sans-serif'],
      mono: ['Space Mono', 'monospace'],
    }`
	},
	custom: {
		heading: 'Inter',
		body: 'Inter',
		mono: 'JetBrains Mono',
		googleFontsUrl:
			'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono&display=swap',
		tailwindConfig: `fontFamily: {
      sans: ['Inter', 'sans-serif'],
      mono: ['JetBrains Mono', 'monospace'],
    }`
	}
};

// ---------------------------------------------------------------------------
// Special effects — losse snippets op basis van confirmedEffects
// Sleutels matchen op lowercase substrings van de effectnaam.
// ---------------------------------------------------------------------------
export const SPECIAL_EFFECTS: Record<string, SpecialEffect> = {
	aurora: {
		name: 'Aurora Background',
		tailwind:
			'absolute inset-0 bg-gradient-to-r from-violet-500 via-blue-500 to-cyan-500 blur-3xl opacity-30 animate-pulse pointer-events-none -z-10',
		description: 'Animerende gradient glow achtergrond'
	},
	gradientborder: {
		name: 'Gradient Border',
		wrapper: 'p-[1px] rounded-xl bg-gradient-to-r from-violet-500 to-blue-500',
		inner: 'bg-white dark:bg-gray-900 rounded-xl p-4',
		description: 'Gradient rand via wrapper-techniek'
	},
	glow: {
		name: 'Neon Glow',
		tailwind: 'shadow-[0_0_20px_rgba(139,92,246,0.5)] border border-violet-400/30',
		description: 'Neon-glow via box-shadow'
	},
	neon: {
		name: 'Neon Glow',
		tailwind: 'shadow-[0_0_20px_rgba(139,92,246,0.5)] border border-violet-400/30',
		description: 'Neon-glow via box-shadow'
	},
	grain: {
		name: 'Grain Texture',
		css: "background-image: url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")",
		description: 'Subtiele noise-textuur overlay via inline SVG'
	},
	shimmer: {
		name: 'Shimmer / Skeleton',
		tailwind:
			'animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]',
		description: 'Skeleton loading shimmer effect'
	},
	frosted: {
		name: 'Frosted Glass',
		tailwind: 'bg-white/10 backdrop-blur-md border border-white/20',
		description: 'Bevroren glas effect (variant van glassmorphism)'
	}
};

// ---------------------------------------------------------------------------
// Animatie klassen-referentie (tailwindcss-animate + tailwindcss-animated)
// ---------------------------------------------------------------------------
export const ANIMATION_CLASSES = {
	enter: [
		'animate-in',
		'fade-in',
		'fade-in-0',
		'zoom-in-95',
		'slide-in-from-top-2',
		'slide-in-from-bottom-2',
		'slide-in-from-left-2',
		'slide-in-from-right-2'
	],
	exit: [
		'animate-out',
		'fade-out',
		'fade-out-0',
		'zoom-out-95',
		'slide-out-to-top-2',
		'slide-out-to-bottom-2'
	],
	loop: ['animate-spin', 'animate-ping', 'animate-pulse', 'animate-bounce'],
	extended: [
		'animate-wiggle',
		'animate-shake',
		'animate-jump-in',
		'animate-jump-out',
		'animate-flip-up',
		'animate-flip-down',
		'animate-rotate-y',
		'animate-fade-down',
		'animate-fade-up'
	],
	duration: ['duration-75', 'duration-100', 'duration-150', 'duration-200', 'duration-300', 'duration-500', 'duration-700'],
	easing: ['ease-in', 'ease-out', 'ease-in-out'],
	delay: ['delay-75', 'delay-100', 'delay-150', 'delay-200', 'delay-300', 'delay-500']
};
