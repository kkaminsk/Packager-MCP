import { getLogger } from '../utils/logger.js';
export function registerResourceHandlers(server) {
    const logger = getLogger().child({ handler: 'resources' });
    logger.debug('Resource handlers ready (no resources registered yet)');
    // Resources will be registered by subsequent proposals
}
//# sourceMappingURL=resources.js.map