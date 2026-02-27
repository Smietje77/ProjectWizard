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
	note?: string;
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
	},
	geist: {
		heading: 'Geist',
		body: 'Geist',
		mono: 'Geist Mono',
		googleFontsUrl:
			'https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&display=swap',
		tailwindConfig: `fontFamily: {
      sans: ['Geist', 'sans-serif'],
      mono: ['Geist Mono', 'monospace'],
    }`
	},
	dm_sans: {
		heading: 'DM Sans',
		body: 'DM Sans',
		mono: 'DM Mono',
		googleFontsUrl:
			'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=DM+Mono:wght@400;500&display=swap',
		tailwindConfig: `fontFamily: {
      sans: ['DM Sans', 'sans-serif'],
      mono: ['DM Mono', 'monospace'],
    }`
	},
	outfit: {
		heading: 'Outfit',
		body: 'Outfit',
		mono: 'JetBrains Mono',
		googleFontsUrl:
			'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap',
		tailwindConfig: `fontFamily: {
      sans: ['Outfit', 'sans-serif'],
      mono: ['JetBrains Mono', 'monospace'],
    }`
	},
	bricolage: {
		heading: 'Bricolage Grotesque',
		body: 'Inter',
		mono: 'JetBrains Mono',
		googleFontsUrl:
			'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap',
		tailwindConfig: `fontFamily: {
      display: ['Bricolage Grotesque', 'sans-serif'],
      sans: ['Inter', 'sans-serif'],
      mono: ['JetBrains Mono', 'monospace'],
    }`
	},
	editorial: {
		heading: 'Lora',
		body: 'Inter',
		mono: 'Fira Code',
		googleFontsUrl:
			'https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Inter:wght@400;500;600&family=Fira+Code:wght@400;500&display=swap',
		tailwindConfig: `fontFamily: {
      display: ['Lora', 'serif'],
      sans: ['Inter', 'sans-serif'],
      mono: ['Fira Code', 'monospace'],
    }`,
		note: 'klassiek editorial'
	},
	sora: {
		heading: 'Sora',
		body: 'Sora',
		mono: 'Fira Code',
		googleFontsUrl:
			'https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=Fira+Code:wght@400;500&display=swap',
		tailwindConfig: `fontFamily: {
      sans: ['Sora', 'sans-serif'],
      mono: ['Fira Code', 'monospace'],
    }`
	},
	display_hero: {
		heading: 'Clash Display',
		body: 'Satoshi',
		mono: 'Space Mono',
		googleFontsUrl: '',
		tailwindConfig: `fontFamily: {
      display: ['Clash Display', 'sans-serif'],
      sans: ['Satoshi', 'sans-serif'],
      mono: ['Space Mono', 'monospace'],
    }`,
		note: 'Clash Display en Satoshi zijn geen Google Fonts — gebruik fonts.bunny.net of self-host via Fontshare (api.fontshare.com)'
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

// ---------------------------------------------------------------------------
// New interfaces
// ---------------------------------------------------------------------------

export interface UiStyle {
	card: string;
	button: string;
	input: string;
	badge?: string;
	container?: string;
	mood: string;
	recommendedFor: string[];
	colorSchemeHint: 'light' | 'dark' | 'both';
}

export interface IndustryPalette {
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
	label: string;
	mood: string;
	industries: string[];
}

export interface ChartType {
	name: string;
	useCase: string;
	library: string;
	tailwindExample?: string;
}

export interface UxGuideline {
	rules: string[];
	antiPatterns: string[];
	colorRule: string;
	layoutTip: string;
}

export interface DesignReasoning {
	recommendedStyles: string[];
	recommendedPalettes: string[];
	recommendedFonts: string[];
	rationale: string;
	darkModeDefault: boolean;
}

// ---------------------------------------------------------------------------
// UI Styles — 12 concrete componentstijlen met Tailwind-klassen
// Combineert bestaande effect archetypes en nieuwe stijlen.
// ---------------------------------------------------------------------------
export const UI_STYLES: Record<string, UiStyle> = {
	rounded: {
		card: 'rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow bg-white',
		button: 'rounded-full shadow-sm hover:shadow-md transition-all px-6',
		input: 'rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100',
		badge: 'rounded-full px-3 py-1 text-sm font-medium',
		mood: 'Vriendelijk en modern',
		recommendedFor: ['ecommerce', 'saas', 'dashboard', 'consumer'],
		colorSchemeHint: 'both'
	},
	glassmorphism: {
		card: 'bg-white/10 backdrop-blur-md border border-white/20 shadow-xl',
		button: 'bg-white/20 backdrop-blur-sm border border-white/30 hover:bg-white/30 transition-all',
		input: 'bg-white/10 backdrop-blur-sm border border-white/20 focus:border-white/40',
		mood: 'Premium en futuristisch',
		recommendedFor: ['portfolio', 'landing', 'saas', 'ai'],
		colorSchemeHint: 'dark'
	},
	neumorphic: {
		card: 'bg-[#e0e5ec] shadow-[6px_6px_12px_#b8bec7,-6px_-6px_12px_#ffffff] rounded-2xl',
		button: 'bg-[#e0e5ec] shadow-[4px_4px_8px_#b8bec7,-4px_-4px_8px_#ffffff] active:shadow-[inset_4px_4px_8px_#b8bec7,inset_-4px_-4px_8px_#ffffff] rounded-xl transition-all',
		input: 'shadow-[inset_4px_4px_8px_#b8bec7,inset_-4px_-4px_8px_#ffffff] bg-[#e0e5ec] rounded-xl border-none',
		mood: 'Zacht en diepte-gevend',
		recommendedFor: ['dashboard', 'admin', 'healthcare'],
		colorSchemeHint: 'light'
	},
	sharp: {
		card: 'border-2 border-black shadow-[4px_4px_0px_#000] rounded-none bg-white',
		button: 'border-2 border-black shadow-[3px_3px_0px_#000] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all rounded-none font-bold',
		input: 'border-2 border-black rounded-none focus:shadow-[3px_3px_0px_#000] transition-all',
		badge: 'border-2 border-black bg-yellow-300 px-2 py-0.5 font-bold rounded-none text-black',
		mood: 'Brutaal en direct',
		recommendedFor: ['blog', 'portfolio', 'landing', 'creative'],
		colorSchemeHint: 'light'
	},
	minimalist: {
		card: 'bg-white border border-gray-100 shadow-none hover:border-gray-200 transition-colors',
		button: 'bg-gray-900 text-white hover:bg-gray-700 transition-colors rounded-lg px-5',
		input: 'border-b border-gray-300 focus:border-gray-900 rounded-none bg-transparent outline-none transition-colors',
		badge: 'text-xs font-medium text-gray-500 uppercase tracking-wide',
		mood: 'Schoon en gefocust',
		recommendedFor: ['blog', 'portfolio', 'saas', 'content'],
		colorSchemeHint: 'light'
	},
	material: {
		card: 'shadow-md hover:shadow-lg transition-shadow rounded-xl bg-white',
		button: 'bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-md hover:shadow-lg transition-all px-6',
		input: 'border border-blue-200 focus:border-blue-500 rounded-lg bg-blue-50/30 focus:bg-white transition-all',
		badge: 'rounded-full px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800',
		mood: 'Vertrouwd en consistent',
		recommendedFor: ['dashboard', 'admin', 'saas', 'b2b'],
		colorSchemeHint: 'both'
	},
	claymorphism: {
		card: 'rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.12)] bg-gradient-to-br from-white to-gray-50 border-0',
		button: 'rounded-2xl shadow-[0_8px_20px_rgba(0,0,0,0.15)] bg-gradient-to-b from-violet-500 to-violet-600 text-white hover:shadow-[0_12px_28px_rgba(0,0,0,0.2)] transition-all',
		input: 'rounded-2xl border-0 bg-white shadow-[0_4px_12px_rgba(0,0,0,0.08)] focus:shadow-[0_6px_16px_rgba(0,0,0,0.12)] transition-all',
		badge: 'rounded-2xl px-4 py-1 shadow-[0_4px_8px_rgba(0,0,0,0.1)] font-medium',
		mood: 'Speels en driedimensionaal',
		recommendedFor: ['consumer', 'community', 'landing', 'speels'],
		colorSchemeHint: 'light'
	},
	bento: {
		card: 'rounded-2xl bg-gray-50 border-0 p-6 hover:bg-gray-100 transition-colors',
		button: 'rounded-xl bg-gray-900 text-white px-5 hover:bg-gray-800 transition-colors',
		input: 'rounded-xl border border-gray-200 bg-white px-4 py-2',
		badge: 'rounded-lg px-2.5 py-0.5 text-xs bg-gray-200 text-gray-700 font-medium',
		container: 'grid grid-cols-2 md:grid-cols-3 gap-4',
		mood: 'Grid-gedreven en overzichtelijk',
		recommendedFor: ['portfolio', 'dashboard', 'saas', 'ai'],
		colorSchemeHint: 'both'
	},
	aurora: {
		card: 'relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-900/80 to-blue-900/80 border border-violet-500/20 backdrop-blur-sm',
		button: 'bg-gradient-to-r from-violet-500 to-blue-500 text-white rounded-xl px-6 hover:from-violet-600 hover:to-blue-600 transition-all shadow-lg',
		input: 'bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:border-violet-400',
		badge: 'rounded-full px-3 py-1 bg-gradient-to-r from-violet-500/20 to-blue-500/20 border border-violet-400/30 text-violet-200 text-xs',
		mood: 'Levendig en gradient-rijk',
		recommendedFor: ['saas', 'ai', 'portfolio', 'landing'],
		colorSchemeHint: 'dark'
	},
	retro: {
		card: 'border-4 border-black rounded-none bg-yellow-50 shadow-[8px_8px_0px_#000]',
		button: 'border-4 border-black rounded-none bg-yellow-400 px-6 font-bold uppercase tracking-wide shadow-[4px_4px_0px_#000] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all',
		input: 'border-4 border-black rounded-none bg-white px-3 py-2 focus:bg-yellow-50 outline-none',
		badge: 'border-2 border-black rounded-none px-2 py-0.5 font-bold text-xs uppercase bg-pink-400',
		mood: 'Nostalgisch en karakter',
		recommendedFor: ['blog', 'landing', 'creative', 'community'],
		colorSchemeHint: 'light'
	},
	corporate: {
		card: 'rounded-lg border border-blue-100 shadow-sm bg-white hover:shadow-md transition-shadow',
		button: 'rounded-md bg-blue-700 text-white px-6 hover:bg-blue-800 transition-colors font-medium',
		input: 'rounded-md border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500',
		badge: 'rounded px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800',
		mood: 'Professioneel en betrouwbaar',
		recommendedFor: ['b2b', 'healthcare', 'fintech', 'zakelijk'],
		colorSchemeHint: 'light'
	},
	dark_modern: {
		card: 'bg-gray-900 border border-gray-700 rounded-xl hover:border-gray-600 transition-colors',
		button: 'bg-white text-gray-900 rounded-lg px-6 hover:bg-gray-100 transition-colors font-medium',
		input: 'bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400',
		badge: 'rounded-full px-3 py-1 text-xs bg-gray-800 text-gray-300 border border-gray-600',
		mood: 'Krachtig en tech-gericht',
		recommendedFor: ['saas', 'dashboard', 'ai', 'developer'],
		colorSchemeHint: 'dark'
	}
};

// ---------------------------------------------------------------------------
// Industry Palettes — 15 branchegerichte kleurpaletten
// Uitbreiding van ColorPalette met label, mood en industries metadata.
// ---------------------------------------------------------------------------
export const INDUSTRY_PALETTES: Record<string, IndustryPalette> = {
	saas_trust: {
		primary: '#1e40af',
		secondary: '#3b82f6',
		accent: '#0284c7',
		background: '#f8fafc',
		surface: '#ffffff',
		text: '#1e293b',
		textMuted: '#64748b',
		border: '#dbeafe',
		darkBackground: '#0f172a',
		darkSurface: '#1e293b',
		label: 'SaaS Vertrouwen',
		mood: 'Professioneel en betrouwbaar',
		industries: ['saas', 'b2b']
	},
	saas_violet: {
		primary: '#7c3aed',
		secondary: '#8b5cf6',
		accent: '#6d28d9',
		background: '#faf5ff',
		surface: '#ffffff',
		text: '#1f2937',
		textMuted: '#6b7280',
		border: '#ede9fe',
		darkBackground: '#1a0533',
		darkSurface: '#2d1057',
		label: 'SaaS Modern',
		mood: 'Innovatief en energiek',
		industries: ['saas', 'ai']
	},
	ecommerce_warm: {
		primary: '#dc2626',
		secondary: '#ef4444',
		accent: '#f59e0b',
		background: '#fff7ed',
		surface: '#ffffff',
		text: '#1c1917',
		textMuted: '#78716c',
		border: '#fed7aa',
		darkBackground: '#1c0a00',
		darkSurface: '#2d1200',
		label: 'E-commerce Energie',
		mood: 'Actiegericht en urgent',
		industries: ['ecommerce']
	},
	ecommerce_clean: {
		primary: '#0f766e',
		secondary: '#14b8a6',
		accent: '#f97316',
		background: '#f0fdfa',
		surface: '#ffffff',
		text: '#134e4a',
		textMuted: '#6b7280',
		border: '#ccfbf1',
		darkBackground: '#042f2e',
		darkSurface: '#0d3b38',
		label: 'E-commerce Fris',
		mood: 'Helder en vertrouwen',
		industries: ['ecommerce', 'lifestyle']
	},
	healthcare: {
		primary: '#0369a1',
		secondary: '#0ea5e9',
		accent: '#22c55e',
		background: '#f0f9ff',
		surface: '#ffffff',
		text: '#0c4a6e',
		textMuted: '#64748b',
		border: '#bae6fd',
		darkBackground: '#0c2340',
		darkSurface: '#1a3a5c',
		label: 'Healthcare Kalm',
		mood: 'Vertrouwend en kalm',
		industries: ['healthcare', 'b2b']
	},
	fintech: {
		primary: '#1e3a5f',
		secondary: '#2563eb',
		accent: '#10b981',
		background: '#f8fafc',
		surface: '#ffffff',
		text: '#1e293b',
		textMuted: '#475569',
		border: '#cbd5e1',
		darkBackground: '#0a1628',
		darkSurface: '#1a2a45',
		label: 'Fintech Solide',
		mood: 'Veilig en stabiel',
		industries: ['fintech', 'b2b']
	},
	creative: {
		primary: '#9333ea',
		secondary: '#ec4899',
		accent: '#f59e0b',
		background: '#fafafa',
		surface: '#f5f3ff',
		text: '#1f2937',
		textMuted: '#6b7280',
		border: '#ddd6fe',
		darkBackground: '#1a0533',
		darkSurface: '#2d1057',
		label: 'Creatief & Levendig',
		mood: 'Expressief en uniek',
		industries: ['portfolio', 'creative']
	},
	minimal_dark: {
		primary: '#18181b',
		secondary: '#3f3f46',
		accent: '#3b82f6',
		background: '#09090b',
		surface: '#18181b',
		text: '#fafafa',
		textMuted: '#a1a1aa',
		border: '#27272a',
		darkBackground: '#09090b',
		darkSurface: '#18181b',
		label: 'Minimaal Donker',
		mood: 'Strak en gefocust',
		industries: ['saas', 'dashboard', 'ai']
	},
	editorial: {
		primary: '#1c1917',
		secondary: '#44403c',
		accent: '#d97706',
		background: '#fafaf9',
		surface: '#ffffff',
		text: '#1c1917',
		textMuted: '#78716c',
		border: '#e7e5e4',
		darkBackground: '#0c0a09',
		darkSurface: '#1c1917',
		label: 'Redactioneel',
		mood: 'Elegant en leesbaar',
		industries: ['blog', 'content']
	},
	nature: {
		primary: '#166534',
		secondary: '#16a34a',
		accent: '#65a30d',
		background: '#f0fdf4',
		surface: '#ffffff',
		text: '#14532d',
		textMuted: '#6b7280',
		border: '#bbf7d0',
		darkBackground: '#052e16',
		darkSurface: '#14532d',
		label: 'Natuur & Duurzaam',
		mood: 'Fris en organisch',
		industries: ['ecommerce', 'lifestyle']
	},
	luxury: {
		primary: '#1c1917',
		secondary: '#44403c',
		accent: '#b45309',
		background: '#fffbf5',
		surface: '#ffffff',
		text: '#1c1917',
		textMuted: '#78716c',
		border: '#e7d9c5',
		darkBackground: '#0c0a09',
		darkSurface: '#1c1917',
		label: 'Luxe & Premium',
		mood: 'Exclusief en verfijnd',
		industries: ['ecommerce', 'portfolio']
	},
	playful: {
		primary: '#7c3aed',
		secondary: '#ec4899',
		accent: '#f59e0b',
		background: '#fafafa',
		surface: '#fdf4ff',
		text: '#1f2937',
		textMuted: '#6b7280',
		border: '#f0abfc',
		darkBackground: '#1a0533',
		darkSurface: '#2d1057',
		label: 'Speels & Kleurrijk',
		mood: 'Vrolijk en uitnodigend',
		industries: ['consumer', 'community', 'speels']
	},
	corporate_blue: {
		primary: '#1d4ed8',
		secondary: '#3b82f6',
		accent: '#0ea5e9',
		background: '#eff6ff',
		surface: '#ffffff',
		text: '#1e3a8a',
		textMuted: '#64748b',
		border: '#bfdbfe',
		darkBackground: '#0f1c40',
		darkSurface: '#1a2e6b',
		label: 'Corporate Klassiek',
		mood: 'Formeel en betrouwbaar',
		industries: ['b2b', 'healthcare', 'corporate']
	},
	dark_tech: {
		primary: '#020617',
		secondary: '#0f172a',
		accent: '#22d3ee',
		background: '#020617',
		surface: '#0f172a',
		text: '#e2e8f0',
		textMuted: '#64748b',
		border: '#1e293b',
		darkBackground: '#020617',
		darkSurface: '#0f172a',
		label: 'Dark Tech / AI',
		mood: 'Futuristisch en technisch',
		industries: ['saas', 'ai', 'dashboard', 'developer']
	},
	warm_neutral: {
		primary: '#92400e',
		secondary: '#b45309',
		accent: '#d97706',
		background: '#fffbf5',
		surface: '#ffffff',
		text: '#451a03',
		textMuted: '#92400e',
		border: '#fde68a',
		darkBackground: '#1c0a00',
		darkSurface: '#2d1200',
		label: 'Warm Neutraal',
		mood: 'Persoonlijk en toegankelijk',
		industries: ['portfolio', 'blog', 'lifestyle']
	}
};

// ---------------------------------------------------------------------------
// Chart types — aanbevolen visualisaties per use case
// ---------------------------------------------------------------------------
export const CHART_TYPES: Record<string, ChartType> = {
	bar: {
		name: 'Staafdiagram',
		useCase: 'Vergelijkingen en rankings',
		library: 'Recharts BarChart',
		tailwindExample: 'h-64 w-full'
	},
	line: {
		name: 'Lijndiagram',
		useCase: 'Trends over tijd',
		library: 'Recharts LineChart'
	},
	pie_donut: {
		name: 'Taart / Donut',
		useCase: 'Percentages en aandelen',
		library: 'Recharts PieChart'
	},
	area: {
		name: 'Vlakdiagram',
		useCase: 'Cumulatieve data en volumetrends',
		library: 'Recharts AreaChart'
	},
	scatter: {
		name: 'Spreidingsdiagram',
		useCase: 'Correlaties tussen twee variabelen',
		library: 'Recharts ScatterChart'
	},
	heatmap: {
		name: 'Heatmap',
		useCase: 'Activiteit over tijd (GitHub-stijl)',
		library: 'Custom met D3 of react-calendar-heatmap'
	},
	kpi_cards: {
		name: 'KPI Cards',
		useCase: 'Enkelvoudige metrics prominent tonen',
		library: 'shadcn/ui Card component',
		tailwindExample: 'grid grid-cols-2 md:grid-cols-4 gap-4'
	},
	sparkline: {
		name: 'Sparkline',
		useCase: 'Compacte trendlijn inline naast een getal',
		library: 'Recharts LineChart (minimal)'
	}
};

// ---------------------------------------------------------------------------
// UX Guidelines per projecttype — regels, anti-patterns en layout tips
// ---------------------------------------------------------------------------
export const UX_GUIDELINES: Record<string, UxGuideline> = {
	ecommerce: {
		rules: [
			'Productafbeeldingen dominant — minimaal 400x400px op witte achtergrond',
			'CTA-knop altijd zichtbaar (sticky header of persistent cart icon)',
			'Trust signals dichtbij prijs: reviews, garantie-iconen, betaalmethoden',
			'Mobile-first: 70%+ van shoppers gebruikt mobiel',
			'Zoekfunctie prominent — minimaal in navigatie'
		],
		antiPatterns: [
			'Checkout flow met meer dan 3 stappen',
			'Verborgen verzendkosten (toon vroeg)',
			'Verplichte registratie voor checkout'
		],
		colorRule: 'Groen of oranje voor primaire CTA; rood alleen voor kortingen en fouten',
		layoutTip: 'Productgrid: 2 kolommen op mobiel, 3-4 op desktop; witruimte tussen cards'
	},
	saas: {
		rules: [
			'Onboarding flow maximaal 3-4 stappen met progressie-indicator',
			'Dashboard met empty state — toon waarde direct bij lege data',
			'Sidebar navigatie voor 5+ secties; topbar voor 3-4',
			'Tooltips bij complexe features',
			'Consistent gebruik van iconen naast labels'
		],
		antiPatterns: [
			'Feature-wall bij eerste login (onboarding vóór dashboard)',
			'Geen empty states (lege lijsten zonder uitleg)',
			'Modal over modal stacking'
		],
		colorRule: 'Blauw/violet voor vertrouwen en focus-acties; groen voor succes; rood voor destructieve acties',
		layoutTip: 'Sidebar: 240px; content area: flex-1; gebruik max-w-7xl voor content containment'
	},
	blog: {
		rules: [
			'Leescomfort: maximaal 65-70 karakters per regel',
			'Inhoudsopgave voor lange artikelen (>1500 woorden)',
			'Gerelateerde artikelen onderaan elk artikel',
			'Leestijd indicatie in header (X min lezen)',
			'Goede typografische hiërarchie: H1 > H2 > H3 > body'
		],
		antiPatterns: [
			'Meer dan 2 font families',
			'Te korte regels (<45 tekens) of te lange (>80 tekens)',
			'Autoplay video of audio'
		],
		colorRule: 'Hoog contrast tussen tekst en achtergrond (WCAG AA minimum)',
		layoutTip: 'Artikel maximaal 680px breed; sidebar eventueel voor TOC of recente posts'
	},
	portfolio: {
		rules: [
			'Werk laten spreken: grote afbeeldingen, minimal tekst',
			'Contact info prominent en makkelijk bereikbaar',
			'Projecten met context: doel, aanpak, resultaat',
			"Laadtijd optimaliseren voor beeldintensieve pagina's",
			'Mobiel perfect — opdrachtgevers bekijken op telefoon'
		],
		antiPatterns: [
			"Te lange introductie vóór werk te zien is",
			'Alleen logo\'s zonder context bij case studies',
			'Geen call-to-action'
		],
		colorRule: 'Laat het werk de kleur bepalen; neutrale achtergrond (wit/donker) als canvas',
		layoutTip: "Masonry of grid layout voor projectoverzicht; fullscreen hero per caseStudy"
	},
	dashboard: {
		rules: [
			'Meest gebruikte acties maximaal 2 klikken diep',
			'Data-dichtheid aanpasbaar (compact/comfortabel view)',
			'Filtering altijd direct zichtbaar bij datatabellen',
			'Lege staten met actiegericht bericht ("Nog geen data — voeg toe")',
			'Keyboard navigatie ondersteunen'
		],
		antiPatterns: [
			'Pie charts voor meer dan 5 segmenten (gebruik bar)',
			'Dashboard zonder datumfilter',
			'Alle informatie in één scherm proppen'
		],
		colorRule: 'Consistent kleurgebruik voor statussen: groen=succes, rood=fout, oranje=waarschuwing, blauw=info',
		layoutTip: 'KPI cards bovenaan; main chart/table in het midden; details in expandable rows'
	},
	marketplace: {
		rules: [
			'Duidelijk onderscheid koper/verkoper flow',
			'Betrouwbaarheidssignalen overal: reviews, verificatie-badges, stats',
			'Zoeken + filteren must-have op listingpagina',
			'Snelle preview zonder te navigeren',
			'Berichten-systeem toegankelijk via persistent UI'
		],
		antiPatterns: [
			'Verborgen commissies',
			'Geen verificatiesysteem voor verkopers',
			'Checkout zonder escrow of bescherming'
		],
		colorRule: 'Neutraal basiskleur; gebruik accentkleur voor CTAs en trust-badges',
		layoutTip: 'Listings in grid (3-4 kolommen desktop); filter sidebar links; sortering rechts boven'
	},
	landing: {
		rules: [
			'Above the fold: propositie duidelijk in 5 seconden',
			'Social proof hoog plaatsen (direct na hero)',
			'Eén primaire CTA per sectie, consistent',
			'Pricing sectie verplicht voor SaaS/diensten',
			'Laadtijd < 2 seconden (Core Web Vitals)'
		],
		antiPatterns: [
			'Meerdere concurrerende CTAs op één scherm',
			'Carousel/slider in hero (geen aandacht)',
			'Lange formulieren zonder progressive disclosure'
		],
		colorRule: 'CTA-kleur nergens anders gebruiken (maximale contrast en focus)',
		layoutTip: 'Sectie-volgorde: Hero > Social proof > Features > How it works > Pricing > FAQ > CTA'
	},
	community: {
		rules: [
			'Gebruikersprofiel snel bereikbaar',
			'Notificaties nooit blokkeren (badge, niet modal)',
			'Bericht-threading duidelijk visueel (indent of lijn)',
			'Moderatietools voor eigenaar toegankelijk',
			'Zoekfunctie doorzoekt threads en gebruikers'
		],
		antiPatterns: [
			'Anonieme posting zonder optie voor profiel',
			'Geen rapporteer-functie',
			'Eindeloos scrollende feed zonder paginering'
		],
		colorRule: 'Rustige basiskleur; heldere accentkleur voor notificaties en badges',
		layoutTip: 'Feed links/midden; sidebar rechts voor trending, tags, online users'
	}
};

// ---------------------------------------------------------------------------
// Design Reasoning — aanbevelingen per projecttype voor de coordinator
// Koppelt projecttype aan concrete stijl-, palet- en fontkeuzes.
// ---------------------------------------------------------------------------
export const DESIGN_REASONING: Record<string, DesignReasoning> = {
	ecommerce: {
		recommendedStyles: ['rounded', 'minimalist', 'material'],
		recommendedPalettes: ['ecommerce_warm', 'ecommerce_clean', 'luxury'],
		recommendedFonts: ['zakelijk', 'minimalistisch', 'dm_sans'],
		rationale:
			"E-commerce draait om vertrouwen en conversie. Schone, vertrouwde layout met duidelijke CTAs. Productfoto's centraal — geen stijl die daarvan afleidt.",
		darkModeDefault: false
	},
	saas_b2b: {
		recommendedStyles: ['corporate', 'rounded', 'material', 'dark_modern'],
		recommendedPalettes: ['saas_trust', 'corporate_blue', 'fintech', 'minimal_dark'],
		recommendedFonts: ['zakelijk', 'geist', 'dm_sans'],
		rationale:
			'B2B SaaS vereist professionaliteit en betrouwbaarheid. Gestructureerd en data-gedreven design. Beslissers beoordelen ook op uitstraling.',
		darkModeDefault: false
	},
	saas_consumer: {
		recommendedStyles: ['rounded', 'glassmorphism', 'aurora', 'claymorphism'],
		recommendedPalettes: ['saas_violet', 'creative', 'playful'],
		recommendedFonts: ['speels', 'outfit', 'sora'],
		rationale:
			'Consumer SaaS mag persoonlijker en visueel aantrekkelijker zijn. Onboarding en emotie zijn belangrijk.',
		darkModeDefault: false
	},
	portfolio: {
		recommendedStyles: ['bento', 'minimalist', 'glassmorphism', 'aurora'],
		recommendedPalettes: ['creative', 'luxury', 'minimal_dark', 'warm_neutral'],
		recommendedFonts: ['speels', 'minimalistisch', 'bricolage', 'display_hero'],
		rationale:
			'Portfolio = opvallen en indruk maken. Creatief, persoonlijk en gedurfd mag hier. Het werk staat centraal.',
		darkModeDefault: true
	},
	blog_content: {
		recommendedStyles: ['minimalist', 'sharp', 'retro'],
		recommendedPalettes: ['editorial', 'warm_neutral', 'nature'],
		recommendedFonts: ['minimalistisch', 'editorial', 'zakelijk'],
		rationale:
			'Blog prioriteit: leesbaarheid en content. Minimale afleiding, sterke typografie, rustgevende kleuren.',
		darkModeDefault: false
	},
	dashboard_admin: {
		recommendedStyles: ['material', 'rounded', 'dark_modern'],
		recommendedPalettes: ['saas_trust', 'minimal_dark', 'dark_tech', 'fintech'],
		recommendedFonts: ['geist', 'zakelijk', 'dm_sans'],
		rationale:
			'Dashboard: overzicht en efficiency. Dense data vereist clean layout, consistent kleurgebruik voor statussen.',
		darkModeDefault: true
	},
	marketplace: {
		recommendedStyles: ['rounded', 'minimalist', 'material'],
		recommendedPalettes: ['ecommerce_clean', 'saas_trust', 'warm_neutral'],
		recommendedFonts: ['zakelijk', 'dm_sans', 'outfit'],
		rationale:
			'Marketplace: vertrouwen tussen vreemden. Transparant, review-gedreven, neutraal zodat het aanbod centraal staat.',
		darkModeDefault: false
	},
	community: {
		recommendedStyles: ['rounded', 'material', 'claymorphism'],
		recommendedPalettes: ['playful', 'saas_trust', 'creative'],
		recommendedFonts: ['speels', 'outfit', 'dm_sans'],
		rationale:
			'Community: verbinding en betrokkenheid. Warm, toegankelijk design dat mensen uitnodigt te reageren.',
		darkModeDefault: false
	},
	landing: {
		recommendedStyles: ['glassmorphism', 'aurora', 'minimalist', 'rounded'],
		recommendedPalettes: ['saas_violet', 'dark_tech', 'creative', 'saas_trust'],
		recommendedFonts: ['sora', 'bricolage', 'zakelijk', 'outfit'],
		rationale:
			'Landing page: eerste indruk en conversie. Visueel indrukwekkend, duidelijke waardepropositie, één sterke CTA.',
		darkModeDefault: false
	}
};
