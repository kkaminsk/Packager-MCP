import { getLogger } from '../utils/logger.js';
export function registerToolHandlers(server) {
    const logger = getLogger().child({ handler: 'tools' });
    logger.debug('Tool handlers ready (no tools registered yet)');
    // Tools will be registered by subsequent proposals
}
//# sourceMappingURL=tools.js.map