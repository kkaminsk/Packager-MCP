import { getLogger } from '../utils/logger.js';
import { getPsadtService } from '../services/psadt.js';
export function registerResourceHandlers(server) {
    const logger = getLogger().child({ handler: 'resources' });
    const psadtService = getPsadtService();
    // Get list of available resources
    const resources = psadtService.listResources();
    // Helper function to create resource handler
    const createResourceHandler = (uri) => {
        return async () => {
            const resource = psadtService.loadResource(uri);
            if (!resource) {
                return {
                    contents: [{ uri, text: 'Resource not found', mimeType: 'text/plain' }],
                };
            }
            return {
                contents: [{ uri: resource.uri, text: resource.content, mimeType: 'text/markdown' }],
            };
        };
    };
    // Register PSADT documentation resources
    server.resource('psadt-overview', 'psadt://docs/overview', { description: 'PSADT v4 architecture and concepts overview', mimeType: 'text/markdown' }, createResourceHandler('psadt://docs/overview'));
    server.resource('psadt-functions', 'psadt://docs/functions', { description: 'PSADT v4 function reference with all ADT-prefixed commands', mimeType: 'text/markdown' }, createResourceHandler('psadt://docs/functions'));
    server.resource('psadt-variables', 'psadt://docs/variables', { description: 'PSADT v4 built-in variables including $ADTSession object', mimeType: 'text/markdown' }, createResourceHandler('psadt://docs/variables'));
    server.resource('psadt-migration', 'psadt://docs/migration', { description: 'Guide for migrating PSADT scripts from v3 to v4', mimeType: 'text/markdown' }, createResourceHandler('psadt://docs/migration'));
    server.resource('psadt-best-practices', 'psadt://docs/best-practices', { description: 'Best practices and recommended patterns for PSADT deployments', mimeType: 'text/markdown' }, createResourceHandler('psadt://docs/best-practices'));
    // Register installer guide resources
    server.resource('installers-msi', 'kb://installers/msi', { description: 'MSI Windows Installer packaging guide', mimeType: 'text/markdown' }, createResourceHandler('kb://installers/msi'));
    server.resource('installers-exe', 'kb://installers/exe', { description: 'EXE installer guide covering Inno Setup, NSIS, InstallShield, and more', mimeType: 'text/markdown' }, createResourceHandler('kb://installers/exe'));
    server.resource('installers-msix', 'kb://installers/msix', { description: 'MSIX/AppX modern packaging guide', mimeType: 'text/markdown' }, createResourceHandler('kb://installers/msix'));
    // Register pattern resources
    server.resource('patterns-detection', 'kb://patterns/detection', { description: 'Intune detection rule patterns and examples', mimeType: 'text/markdown' }, createResourceHandler('kb://patterns/detection'));
    server.resource('patterns-prerequisites', 'kb://patterns/prerequisites', { description: 'Patterns for handling application prerequisites and dependencies', mimeType: 'text/markdown' }, createResourceHandler('kb://patterns/prerequisites'));
    // Register reference resources
    server.resource('exit-codes', 'ref://exit-codes', { description: 'Common installer exit codes and their meanings', mimeType: 'text/markdown' }, createResourceHandler('ref://exit-codes'));
    logger.info('Registered PSADT resources', {
        count: resources.length,
        categories: ['psadt://docs/*', 'kb://installers/*', 'kb://patterns/*', 'ref://*'],
    });
}
//# sourceMappingURL=resources.js.map