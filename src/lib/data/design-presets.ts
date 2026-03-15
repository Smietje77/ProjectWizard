// src/lib/data/design-presets.ts
// Design presets met concrete tokens voor snelle project setup

export interface DesignPreset {
  id: string;
  name: string;
  description: string;
  theme: 'dark' | 'light' | 'warm';
  fonts: {
    heading: string;
    body: string;
    mono: string;
    googleFontsUrl: string;
    tailwindConfig: string;
  };
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textMuted: string;
    border: string;
  };
  style: {
    componentStyle: string;
    borderRadius: string;
    shadow: string;
  };
  cssVariables: string;
  tailwindExtend: string;
}

export const DESIGN_PRESETS: Record<string, DesignPreset> = {
  voltflow: {
    id: 'voltflow',
    name: 'VoltFlow',
    description: 'Donker, energiek, lime-groen accent, glassmorphism, modern tech',
    theme: 'dark',
    fonts: {
      heading: 'Space Grotesk',
      body: 'Archivo',
      mono: 'JetBrains Mono',
      googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Archivo:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap',
      tailwindConfig: `fontFamily: {
  display: ['Space Grotesk', 'sans-serif'],
  sans: ['Archivo', 'sans-serif'],
  mono: ['JetBrains Mono', 'monospace'],
},`
    },
    colors: {
      primary: '#BFF549',
      secondary: '#1a1a2e',
      accent: '#BFF549',
      background: '#0a0a0a',
      surface: '#141414',
      text: '#f5f5f5',
      textMuted: '#737373',
      border: '#2a2a2a',
    },
    style: {
      componentStyle: 'glassmorphism',
      borderRadius: '0.75rem',
      shadow: '0 4px 24px rgba(191, 245, 73, 0.1)',
    },
    cssVariables: `:root {
  --color-primary:    #BFF549;
  --color-secondary:  #1a1a2e;
  --color-accent:     #BFF549;
  --color-background: #0a0a0a;
  --color-surface:    #141414;
  --color-text:       #f5f5f5;
  --color-text-muted: #737373;
  --color-border:     #2a2a2a;
  --radius:           0.75rem;
}`,
    tailwindExtend: `colors: {
  primary:    'var(--color-primary)',
  secondary:  'var(--color-secondary)',
  accent:     'var(--color-accent)',
  background: 'var(--color-background)',
  surface:    'var(--color-surface)',
  foreground: 'var(--color-text)',
  muted:      'var(--color-text-muted)',
  border:     'var(--color-border)',
},
borderRadius: {
  DEFAULT: '0.75rem',
},
boxShadow: {
  glow: '0 4px 24px rgba(191, 245, 73, 0.1)',
  'glow-lg': '0 8px 40px rgba(191, 245, 73, 0.15)',
},
fontFamily: {
  display: ['Space Grotesk', 'sans-serif'],
  sans: ['Archivo', 'sans-serif'],
  mono: ['JetBrains Mono', 'monospace'],
},`
  },

  clean_pro: {
    id: 'clean_pro',
    name: 'Clean Pro',
    description: 'Licht, blauw, strak, zakelijke SaaS',
    theme: 'light',
    fonts: {
      heading: 'Inter',
      body: 'Inter',
      mono: 'Geist Mono',
      googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
      tailwindConfig: `fontFamily: {
  display: ['Inter', 'sans-serif'],
  sans: ['Inter', 'sans-serif'],
  mono: ['Geist Mono', 'monospace'],
},`
    },
    colors: {
      primary: '#2563eb',
      secondary: '#475569',
      accent: '#2563eb',
      background: '#ffffff',
      surface: '#f8fafc',
      text: '#0f172a',
      textMuted: '#64748b',
      border: '#e2e8f0',
    },
    style: {
      componentStyle: 'rounded',
      borderRadius: '0.5rem',
      shadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    },
    cssVariables: `:root {
  --color-primary:    #2563eb;
  --color-secondary:  #475569;
  --color-accent:     #2563eb;
  --color-background: #ffffff;
  --color-surface:    #f8fafc;
  --color-text:       #0f172a;
  --color-text-muted: #64748b;
  --color-border:     #e2e8f0;
  --radius:           0.5rem;
}`,
    tailwindExtend: `colors: {
  primary:    'var(--color-primary)',
  secondary:  'var(--color-secondary)',
  accent:     'var(--color-accent)',
  background: 'var(--color-background)',
  surface:    'var(--color-surface)',
  foreground: 'var(--color-text)',
  muted:      'var(--color-text-muted)',
  border:     'var(--color-border)',
},
borderRadius: {
  DEFAULT: '0.5rem',
},
boxShadow: {
  soft: '0 1px 3px rgba(0, 0, 0, 0.1)',
  'soft-lg': '0 4px 12px rgba(0, 0, 0, 0.08)',
},
fontFamily: {
  display: ['Inter', 'sans-serif'],
  sans: ['Inter', 'sans-serif'],
  mono: ['Geist Mono', 'monospace'],
},`
  },

  warm_craft: {
    id: 'warm_craft',
    name: 'Warm Craft',
    description: 'Warm, amber, serif headings, ambachtelijk',
    theme: 'warm',
    fonts: {
      heading: 'Playfair Display',
      body: 'Source Sans 3',
      mono: 'Fira Code',
      googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Source+Sans+3:wght@400;500;600&family=Fira+Code:wght@400;500&display=swap',
      tailwindConfig: `fontFamily: {
  display: ['Playfair Display', 'serif'],
  sans: ['Source Sans 3', 'sans-serif'],
  mono: ['Fira Code', 'monospace'],
},`
    },
    colors: {
      primary: '#d97706',
      secondary: '#78716c',
      accent: '#d97706',
      background: '#fffbf5',
      surface: '#ffffff',
      text: '#1c1917',
      textMuted: '#78716c',
      border: '#e7d9c5',
    },
    style: {
      componentStyle: 'rounded',
      borderRadius: '1rem',
      shadow: '0 2px 8px rgba(217, 119, 6, 0.08)',
    },
    cssVariables: `:root {
  --color-primary:    #d97706;
  --color-secondary:  #78716c;
  --color-accent:     #d97706;
  --color-background: #fffbf5;
  --color-surface:    #ffffff;
  --color-text:       #1c1917;
  --color-text-muted: #78716c;
  --color-border:     #e7d9c5;
  --radius:           1rem;
}`,
    tailwindExtend: `colors: {
  primary:    'var(--color-primary)',
  secondary:  'var(--color-secondary)',
  accent:     'var(--color-accent)',
  background: 'var(--color-background)',
  surface:    'var(--color-surface)',
  foreground: 'var(--color-text)',
  muted:      'var(--color-text-muted)',
  border:     'var(--color-border)',
},
borderRadius: {
  DEFAULT: '1rem',
},
boxShadow: {
  warm: '0 2px 8px rgba(217, 119, 6, 0.08)',
  'warm-lg': '0 4px 16px rgba(217, 119, 6, 0.12)',
},
fontFamily: {
  display: ['Playfair Display', 'serif'],
  sans: ['Source Sans 3', 'sans-serif'],
  mono: ['Fira Code', 'monospace'],
},`
  }
};

export function getDesignPreset(id: string): DesignPreset | undefined {
  return DESIGN_PRESETS[id];
}
