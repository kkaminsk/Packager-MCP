import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getLogger } from '../utils/logger.js';

export function registerToolHandlers(server: McpServer): void {
  const logger = getLogger().child({ handler: 'tools' });
  logger.debug('Tool handlers ready (no tools registered yet)');
  // Tools will be registered by subsequent proposals
}
