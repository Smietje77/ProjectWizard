// src/lib/types/gsd.ts
// Type definities voor GSD folder generatie

export interface WizardAnswers {
  // Requirements Specialist
  projectName: string;
  projectGoal: string;
  problemDescription: string;
  targetUsers: string;
  techLevel: 'beginner' | 'intermediate' | 'advanced';
  coreFeatures: Feature[];
  outOfScope: string[];

  // Architect Specialist
  frontendFramework: 'sveltekit' | 'nextjs' | 'nuxt';
  database: 'supabase' | 'postgresql' | 'sqlite';
  authMethod: 'magic-link' | 'email-password' | 'social' | 'none';
  
  // Frontend Specialist
  uiLibrary: 'skeleton' | 'shadcn' | 'daisyui' | 'custom';
  navigationPattern: 'sidebar' | 'topbar' | 'bottombar' | 'none';
  stylingApproach: 'tailwind' | 'css-modules' | 'styled-components';
  
  // Backend Specialist
  apiPattern: 'rest' | 'graphql' | 'trpc';
  dataEntities: DataEntity[];
  
  // DevOps Specialist
  deploymentTarget: 'dokploy' | 'vercel' | 'coolify';
  hasDomain: boolean;
  domainName?: string;
  
  // Integration Specialist
  requiredMcps: string[];
  externalServices: ExternalService[];
  
  // Testing Specialist
  testStrategy: 'minimal' | 'standard' | 'comprehensive';
  criticalFlows: string[];

  // Design Specialist
  designStyle: 'minimalistisch' | 'zakelijk' | 'speels' | 'brutalistisch' | 'custom';
  colorScheme: 'dark' | 'light' | 'auto';
  typography: 'sans-serif' | 'serif' | 'mono' | 'mixed';
  componentStyle: 'rounded' | 'sharp' | 'neumorphic' | 'glassmorphism';
  screenshotAnalysis?: PageScreenshot[] | null;
  confirmedEffects?: ConfirmedEffects | null;
}

export interface ScreenshotAnalysis {
  colors: {
    primary: string; secondary: string; accent: string;
    background: string; surface: string; text: string;
    textMuted: string; border: string;
  };
  typography: {
    headingFont: string; bodyFont: string; headingWeight: string;
    headingStyle: string; bodySize: string; lineHeight: string;
  };
  layout: {
    navigation: 'topbar' | 'sidebar' | 'bottombar' | 'none';
    navigationStyle: string; heroType: string; contentWidth: string;
    gridPattern: string; footerStyle: string; sectionDividers: string;
  };
  effects: {
    glassmorphism: boolean; neumorphism: boolean;
    gradients: { used: boolean; type: string; description: string };
    shadows: string; backgroundEffect: string; overlays: string;
    borderStyle: string; glowEffects: boolean; blurEffects: boolean;
  };
  imagery: {
    placeholders: ImagePlaceholder[];
    iconStyle: string; illustrationStyle: string; photoTreatment: string;
  };
  patterns: {
    decorativeElements: string; backgroundPatterns: string;
    whitespace: string; rhythm: string;
  };
  components: {
    borderRadius: string; buttonStyle: string; cardStyle: string;
    inputStyle: string; animationHints: string[];
  };
  mood: {
    overall: string; contrast: string; density: string; temperature: string;
  };
}

export interface ImagePlaceholder {
  location: string;
  type: 'hero' | 'product' | 'avatar' | 'background' | 'icon' | 'logo' | 'gallery';
  suggestedSize: string;
  shape: 'rectangular' | 'square' | 'circular' | 'rounded' | 'masked';
  treatment: string;
}

export interface ConfirmedEffects {
  confirmedEffects: string[];
  removedEffects: string[];
  addedEffects: string[];
  animationPreferences: string[];
}

export interface PageScreenshot {
  pageType: string;
  label: string;
  analysis: ScreenshotAnalysis | Record<string, unknown>;
}

export interface Feature {
  id: string;
  name: string;
  description: string;
  priority: 'must' | 'should' | 'nice';
  category: 'auth' | 'backend' | 'frontend' | 'integration' | 'other';
}

export interface DataEntity {
  name: string;
  fields: string[];
  relations: string[];
}

export interface ExternalService {
  name: string;
  purpose: string;
  mcp?: string;
}

// GSD Output Types
export interface GSDProject {
  version: string;
  projectName: string;
  profile: 'conservative' | 'balanced' | 'aggressive';
  settings: GSDSettings;
  phases: {
    total: number;
    current: number;
  };
}

export interface GSDSettings {
  riskTolerance: 'low' | 'moderate' | 'high';
  autonomyLevel: 'supervised' | 'guided' | 'autonomous';
  checkpointFrequency: 'task' | 'phase' | 'milestone';
  qualityThreshold: 'strict' | 'standard' | 'relaxed';
}

export interface GSDRequirement {
  id: string;
  description: string;
  priority: 'must' | 'should' | 'nice';
  phase: number;
  category: 'functional' | 'technical' | 'quality';
  dependencies?: string[];
}

export interface GSDPhase {
  number: number;
  name: string;
  goal: string;
  duration: string;
  deliverables: string[];
  requirements: string[]; // REQ-IDs
}

export interface GSDOutput {
  project: string;      // PROJECT.md content
  requirements: string; // REQUIREMENTS.md content
  roadmap: string;      // ROADMAP.md content
  config: GSDProject;   // config.json object
  context: string;      // INITIAL_CONTEXT.md content
  state: string;        // STATE.md content
}
