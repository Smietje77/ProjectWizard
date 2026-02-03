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
  screenshotAnalysis?: Record<string, unknown> | null;
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
