import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getLogger } from '../utils/logger.js';

export function registerResourceHandlers(server: McpServer): void {
  const logger = getLogger().child({ handler: 'resources' });
  logger.debug('Resource handlers ready (no resources registered yet)');
  // Resources will be registered by subsequent proposals
}
