// src/lib/generators/templates/index.ts
// Barrel file — re-exports everything so existing imports continue to work.
// Callers use:
//   import { ... } from '$lib/generators/templates'   (resolves here)
//   import { ... } from './templates'                  (resolves here)

export { sanitizeJson, getFrameworkConventions } from './utils';
export { getStripeConfig } from './stripe';
export type { StripeConfig } from './stripe';
export { generateClaudeMdTemplate } from './claude-md';
export { generatePromptMdTemplate } from './prompt-md';
export { generateEnvExampleTemplate } from './env-example';
export { generateMcpJsonTemplate } from './mcp-json';
export { generateCoordinatorAgentTemplate, getSpecialistTemplate } from './agents';
export {
  getSkillTemplate,
  generateDesignSkillTemplate,
  generateBackendSkillTemplate,
  generateTestingSkillTemplate,
  generateIntegrationSkillTemplate,
  generateDeploymentSkillTemplate,
  generateSecuritySkillTemplate
} from './skills';
export { generateProductVisionTemplate, hasEnoughProductStrategy } from './product-vision';
export { generateStitchPrompt } from './stitch-prompt';
