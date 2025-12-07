import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getLogger } from '../utils/logger.js';

export function registerPromptHandlers(server: McpServer): void {
  const logger = getLogger().child({ handler: 'prompts' });
  logger.debug('Prompt handlers ready (no prompts registered yet)');
  // Prompts will be registered by subsequent proposals
}
