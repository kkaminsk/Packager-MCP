// Prompt handlers for MCP server
import { z } from 'zod';
import { getLogger } from '../utils/logger.js';
import { parsePackageAppArgs, executePackageAppWorkflow, formatPackageAppResult, parseTroubleshootArgs, executeTroubleshootWorkflow, formatTroubleshootResult, parseBulkLookupArgs, executeBulkLookupWorkflow, formatBulkLookupResult, parseConvertLegacyArgs, executeConvertLegacyWorkflow, formatConvertLegacyResult, } from '../workflows/index.js';
const logger = getLogger().child({ handler: 'prompts' });
// Schema definitions for prompt arguments
const packageAppArgsSchema = z.object({
    'application-name': z.string().min(1).describe('Application name or Winget package ID'),
    quick: z.string().optional().describe('Skip validation for faster output (true/false)'),
    'no-validate': z.string().optional().describe('Skip validation step (true/false)'),
    architecture: z.enum(['x64', 'x86', 'arm64']).optional().describe('Preferred architecture'),
    complexity: z.enum(['basic', 'standard', 'advanced']).optional().describe('Template complexity'),
    'output-directory': z.string().optional().describe('Directory to create the complete PSADT package with toolkit files'),
});
const troubleshootArgsSchema = z.object({
    'log-file': z.string().optional().describe('Path to log file'),
    'error-code': z.string().optional().describe('Error/exit code to investigate'),
    'error-message': z.string().optional().describe('Error message to analyze'),
    'installer-type': z.string().optional().describe('Installer type if known'),
    description: z.string().optional().describe('Issue description'),
});
const bulkLookupArgsSchema = z.object({
    applications: z.string().min(1).describe('Comma-separated list of applications'),
    output: z.enum(['csv', 'json', 'markdown']).optional().describe('Output format'),
    'include-versions': z.string().optional().describe('Include version history (true/false)'),
    'include-installers': z.string().optional().describe('Include installer details (true/false)'),
});
const convertLegacyArgsSchema = z.object({
    script: z.string().min(1).describe('PSADT v3 script content to convert'),
    verbose: z.string().optional().describe('Include detailed migration notes (true/false)'),
});
/**
 * Register all prompt handlers with the MCP server
 */
export function registerPromptHandlers(server) {
    const handlerLogger = getLogger().child({ handler: 'prompts' });
    handlerLogger.info('Registering prompt handlers');
    // Register package-app prompt
    server.prompt('package-app', 'Guided workflow to create a complete Intune-ready package from Winget metadata', packageAppArgsSchema.shape, async (args) => {
        handlerLogger.debug('Executing package-app prompt', { args });
        const rawArgs = {};
        for (const [key, value] of Object.entries(args)) {
            if (value !== undefined) {
                rawArgs[key] = String(value);
            }
        }
        const parsedArgs = parsePackageAppArgs(rawArgs);
        const result = await executePackageAppWorkflow(parsedArgs);
        const formatted = formatPackageAppResult(result);
        // Build response content
        let content = formatted;
        if (result.script) {
            content += `\n\n### Deploy-Application.ps1\n\n\`\`\`powershell\n${result.script}\n\`\`\``;
        }
        if (result.detection?.powershellScript) {
            content += `\n\n### Detection.ps1\n\n\`\`\`powershell\n${result.detection.powershellScript}\n\`\`\``;
        }
        return {
            messages: [
                {
                    role: 'user',
                    content: {
                        type: 'text',
                        text: `Create an Intune package for: ${parsedArgs.applicationName}`,
                    },
                },
                {
                    role: 'assistant',
                    content: {
                        type: 'text',
                        text: content,
                    },
                },
            ],
        };
    });
    // Register troubleshoot prompt
    server.prompt('troubleshoot', 'Diagnose issues with a failing package by analyzing error codes and logs', troubleshootArgsSchema.shape, async (args) => {
        handlerLogger.debug('Executing troubleshoot prompt', { args });
        const rawArgs = {};
        for (const [key, value] of Object.entries(args)) {
            if (value !== undefined) {
                rawArgs[key] = String(value);
            }
        }
        const parsedArgs = parseTroubleshootArgs(rawArgs);
        const result = await executeTroubleshootWorkflow(parsedArgs);
        const formatted = formatTroubleshootResult(result);
        // Build user query description
        const queryParts = ['Help me troubleshoot a package issue'];
        if (parsedArgs.errorCode !== undefined) {
            queryParts.push(`Exit code: ${parsedArgs.errorCode}`);
        }
        if (parsedArgs.logFile) {
            queryParts.push(`Log file: ${parsedArgs.logFile}`);
        }
        if (parsedArgs.errorMessage) {
            queryParts.push(`Error: ${parsedArgs.errorMessage}`);
        }
        return {
            messages: [
                {
                    role: 'user',
                    content: {
                        type: 'text',
                        text: queryParts.join('. '),
                    },
                },
                {
                    role: 'assistant',
                    content: {
                        type: 'text',
                        text: formatted,
                    },
                },
            ],
        };
    });
    // Register bulk-lookup prompt
    server.prompt('bulk-lookup', 'Retrieve Winget information for multiple applications at once', bulkLookupArgsSchema.shape, async (args) => {
        handlerLogger.debug('Executing bulk-lookup prompt', { args });
        const rawArgs = {};
        for (const [key, value] of Object.entries(args)) {
            if (value !== undefined) {
                rawArgs[key] = String(value);
            }
        }
        const parsedArgs = parseBulkLookupArgs(rawArgs);
        const result = await executeBulkLookupWorkflow(parsedArgs);
        const formatted = formatBulkLookupResult(result);
        return {
            messages: [
                {
                    role: 'user',
                    content: {
                        type: 'text',
                        text: `Look up these applications in Winget: ${parsedArgs.applications}`,
                    },
                },
                {
                    role: 'assistant',
                    content: {
                        type: 'text',
                        text: formatted,
                    },
                },
            ],
        };
    });
    // Register convert-legacy prompt
    server.prompt('convert-legacy', 'Convert a PSADT v3 script to v4 format with function mappings, variable updates, and migration guidance', convertLegacyArgsSchema.shape, async (args) => {
        handlerLogger.debug('Executing convert-legacy prompt', { args });
        const rawArgs = {};
        for (const [key, value] of Object.entries(args)) {
            if (value !== undefined) {
                rawArgs[key] = String(value);
            }
        }
        const parsedArgs = parseConvertLegacyArgs(rawArgs);
        const result = await executeConvertLegacyWorkflow(parsedArgs);
        const formatted = formatConvertLegacyResult(result);
        // Build response content
        let content = formatted;
        if (result.convertedScript) {
            content += `\n\n### Converted Script\n\n\`\`\`powershell\n${result.convertedScript}\n\`\`\``;
        }
        return {
            messages: [
                {
                    role: 'user',
                    content: {
                        type: 'text',
                        text: 'Convert this PSADT v3 script to v4 format',
                    },
                },
                {
                    role: 'assistant',
                    content: {
                        type: 'text',
                        text: content,
                    },
                },
            ],
        };
    });
    handlerLogger.info('Prompt handlers registered', { count: 4 });
}
//# sourceMappingURL=prompts.js.map