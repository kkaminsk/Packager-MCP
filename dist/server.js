#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadConfig } from './config/loader.js';
import { initLogger, getLogger } from './utils/logger.js';
import { initCacheManager } from './cache/lru-cache.js';
import { registerAllHandlers } from './handlers/index.js';
async function main() {
    const config = loadConfig();
    const logger = initLogger(config.logging);
    logger.info('Starting MCP server', {
        name: config.name,
        version: config.version,
    });
    initCacheManager(config.cache);
    const server = new McpServer({
        name: config.name,
        version: config.version,
    }, {
        capabilities: {
            tools: {},
            resources: {},
            prompts: {},
        },
    });
    registerAllHandlers(server);
    const transport = new StdioServerTransport();
    process.on('SIGINT', async () => {
        logger.info('Received SIGINT, shutting down gracefully');
        await server.close();
        process.exit(0);
    });
    process.on('SIGTERM', async () => {
        logger.info('Received SIGTERM, shutting down gracefully');
        await server.close();
        process.exit(0);
    });
    process.on('uncaughtException', (error) => {
        logger.error('Uncaught exception', { error: error.message, stack: error.stack });
        process.exit(1);
    });
    process.on('unhandledRejection', (reason) => {
        logger.error('Unhandled rejection', { reason: String(reason) });
        process.exit(1);
    });
    logger.info('Connecting to stdio transport');
    await server.connect(transport);
    logger.info('MCP server running on stdio');
}
main().catch((error) => {
    const logger = getLogger();
    logger.error('Failed to start server', { error: String(error) });
    process.exit(1);
});
//# sourceMappingURL=server.js.map