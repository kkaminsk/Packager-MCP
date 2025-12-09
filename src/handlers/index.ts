import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerToolHandlers } from './tools.js';
import { registerResourceHandlers } from './resources.js';
import { registerPromptHandlers } from './prompts.js';
import { getLogger } from '../utils/logger.js';

export function registerAllHandlers(server: McpServer): void {
  const logger = getLogger();

  logger.info('Registering MCP handlers');

  registerToolHandlers(server);
  registerResourceHandlers(server);
  registerPromptHandlers(server);

  logger.info('All handlers registered');
}

export { registerToolHandlers } from './tools.js';
export { registerResourceHandlers } from './resources.js';
export { registerPromptHandlers } from './prompts.js';
