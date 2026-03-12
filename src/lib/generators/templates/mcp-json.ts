// src/lib/generators/templates/mcp-json.ts
// .mcp.json template generation

import type { WizardAnswers } from '$lib/types/gsd';

// ─── .mcp.json Template ───────────────────────────────────────────────────

export function generateMcpJsonTemplate(answers: WizardAnswers): string {
  const mcpServers: Record<string, { command: string; args: string[]; env?: Record<string, string> }> = {};

  for (const mcp of answers.requiredMcps) {
    const key = mcp.toLowerCase().replace(/[^a-z0-9]/g, '-');
    switch (mcp.toLowerCase()) {
      case 'supabase':
        mcpServers['supabase'] = {
          command: 'npx',
          args: ['-y', '@supabase/mcp-server'],
          env: {
            SUPABASE_URL: '${SUPABASE_URL}',
            SUPABASE_SERVICE_ROLE_KEY: '${SUPABASE_SERVICE_ROLE_KEY}'
          }
        };
        break;
      case 'filesystem':
        mcpServers['filesystem'] = {
          command: 'npx',
          args: ['-y', '@anthropic/mcp-filesystem', './']
        };
        break;
      case 'github':
        mcpServers['github'] = {
          command: 'npx',
          args: ['-y', '@anthropic/mcp-github'],
          env: {
            GITHUB_TOKEN: '${GITHUB_TOKEN}'
          }
        };
        break;
      case 'browser':
        mcpServers['browser'] = {
          command: 'npx',
          args: ['-y', '@anthropic/mcp-puppeteer']
        };
        break;
      default:
        mcpServers[key] = {
          command: 'npx',
          args: ['-y', `@${key}/mcp-server`]
        };
    }
  }

  const config = { mcpServers };
  return JSON.stringify(config, null, 2);
}
