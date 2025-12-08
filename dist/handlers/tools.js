import { z } from 'zod';
import { getLogger } from '../utils/logger.js';
import { formatErrorForClient, ToolError, GithubApiError, DownloadError, HashVerificationError } from '../utils/errors.js';
import { getWingetService } from '../services/winget.js';
import { getPsadtService } from '../services/psadt.js';
import { getValidationService } from '../services/validation.js';
import { getDetectionService } from '../services/detection.js';
import { getDownloadService } from '../services/download.js';
const searchWingetSchema = z.object({
    query: z.string().min(1).describe('Search query - package name or ID'),
    exact_match: z.boolean().optional().describe('If true, only return exact package ID matches'),
    include_versions: z.boolean().optional().describe('If true, include version history'),
    limit: z.number().min(1).max(50).optional().describe('Maximum number of results (default: 10)'),
});
const getSilentInstallArgsSchema = z.object({
    package_id: z.string().optional().describe('Winget package ID (e.g., "Google.Chrome")'),
    installer_type: z
        .enum(['msi', 'msix', 'exe', 'zip', 'inno', 'nullsoft', 'wix', 'burn', 'portable', 'unknown'])
        .optional()
        .describe('Installer type if known'),
    installer_url: z.string().url().optional().describe('Installer URL to detect type from'),
});
const getPsadtTemplateSchema = z.object({
    application_name: z.string().min(1).describe('Application name (e.g., "Google Chrome")'),
    application_vendor: z.string().min(1).describe('Application vendor/publisher (e.g., "Google")'),
    application_version: z.string().min(1).describe('Application version (e.g., "120.0.6099.109")'),
    installer_type: z
        .enum(['msi', 'msix', 'exe', 'zip', 'inno', 'nullsoft', 'wix', 'burn', 'portable', 'unknown'])
        .describe('Type of installer'),
    complexity: z
        .enum(['basic', 'standard', 'advanced'])
        .optional()
        .describe('Template complexity level (default: standard)'),
    installer_file_name: z.string().optional().describe('Installer filename (e.g., "ChromeSetup.exe")'),
    silent_args: z.string().optional().describe('Silent install arguments (e.g., "/S /norestart")'),
    uninstall_args: z.string().optional().describe('Silent uninstall arguments'),
    product_code: z.string().optional().describe('MSI product code (e.g., "{GUID}")'),
    close_apps: z.array(z.string()).optional().describe('List of process names to close before installation'),
    include_uninstall: z.boolean().optional().describe('Include uninstall logic (default: true)'),
    include_repair: z.boolean().optional().describe('Include repair logic (advanced templates only)'),
    transform_file: z.string().optional().describe('MSI transform file (.mst)'),
    msi_properties: z.string().optional().describe('Additional MSI properties'),
    reboot_behavior: z
        .enum(['never', 'prompt', 'force'])
        .optional()
        .describe('Reboot behavior (default: never)'),
});
const validatePackageSchema = z.object({
    script: z.string().min(1).describe('PowerShell script content to validate'),
    level: z
        .enum(['basic', 'standard', 'strict'])
        .optional()
        .describe('Validation level: basic (errors only), standard (errors + warnings), strict (all issues). Default: standard'),
    environment: z
        .enum(['intune', 'sccm', 'standalone'])
        .optional()
        .describe('Target deployment environment. Default: intune'),
    categories: z
        .array(z.enum(['structure', 'psadt', 'intune', 'security', 'best-practice']))
        .optional()
        .describe('Specific categories to check. Default: all categories'),
});
const comparisonOperatorEnum = z.enum([
    'equal',
    'notEqual',
    'greaterThan',
    'greaterThanOrEqual',
    'lessThan',
    'lessThanOrEqual',
]);
const fileDetectionSchema = z.object({
    path: z.string().min(1).describe('Directory path containing the file (e.g., "C:\\Program Files\\App")'),
    file_or_folder_name: z.string().min(1).describe('File or folder name to check (e.g., "app.exe")'),
    check_32bit_on_64system: z.boolean().optional().describe('Check 32-bit location on 64-bit systems'),
    detection_type: z
        .enum(['exists', 'version', 'sizeInMB', 'modifiedDate'])
        .optional()
        .describe('Type of detection check. Default: exists'),
    operator: comparisonOperatorEnum.optional().describe('Comparison operator for version/size/date checks'),
    detection_value: z.string().optional().describe('Value to compare against (version string, size in MB, or date)'),
});
const registryDetectionSchema = z.object({
    key_path: z.string().min(1).describe('Registry key path (e.g., "HKEY_LOCAL_MACHINE\\SOFTWARE\\App")'),
    value_name: z.string().optional().describe('Registry value name (empty for key existence only)'),
    check_32bit_on_64system: z.boolean().optional().describe('Check 32-bit registry on 64-bit systems'),
    detection_type: z
        .enum(['exists', 'string', 'integer', 'version'])
        .optional()
        .describe('Type of detection check. Default: exists'),
    operator: comparisonOperatorEnum.optional().describe('Comparison operator for value checks'),
    detection_value: z.string().optional().describe('Value to compare against'),
});
const msiDetectionSchema = z.object({
    product_code: z
        .string()
        .regex(/^\{[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}\}$/)
        .describe('MSI product code GUID (e.g., "{xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx}")'),
    product_version_operator: comparisonOperatorEnum.optional().describe('Version comparison operator'),
    product_version: z.string().optional().describe('Version to compare against (e.g., "1.0.0")'),
});
const scriptDetectionSchema = z.object({
    application_name: z.string().min(1).describe('Application name for the detection script'),
    install_path: z.string().optional().describe('Installation directory path'),
    file_name: z.string().optional().describe('Main executable file name'),
    version: z.string().optional().describe('Version requirement'),
    operator: comparisonOperatorEnum.optional().describe('Version comparison operator'),
    registry_key: z.string().optional().describe('Registry key to check (alternative to file)'),
    registry_value_name: z.string().optional().describe('Registry value name containing version'),
});
const generateIntuneDetectionSchema = z.object({
    detection_type: z
        .enum(['file', 'registry', 'msi', 'script'])
        .describe('Type of detection rule to generate'),
    file: fileDetectionSchema.optional().describe('File detection parameters (required if detection_type is "file")'),
    registry: registryDetectionSchema.optional().describe('Registry detection parameters (required if detection_type is "registry")'),
    msi: msiDetectionSchema.optional().describe('MSI detection parameters (required if detection_type is "msi")'),
    script: scriptDetectionSchema.optional().describe('Script detection parameters (required if detection_type is "script")'),
});
export function registerToolHandlers(server) {
    const logger = getLogger().child({ handler: 'tools' });
    // Register search_winget tool
    server.tool('search_winget', 'Search the Winget package repository for application metadata including installer URLs, versions, and silent install arguments', searchWingetSchema.shape, async (args) => {
        logger.debug('Executing search_winget', { args });
        try {
            const validated = searchWingetSchema.parse(args);
            const wingetService = getWingetService();
            const input = {
                query: validated.query,
                exactMatch: validated.exact_match,
                includeVersions: validated.include_versions,
                limit: validated.limit,
            };
            const result = await wingetService.searchPackages(input);
            if (result.results.length === 0) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                query: result.query,
                                totalResults: 0,
                                message: `No packages found matching "${result.query}". Try a different search term or check the package ID.`,
                                cached: result.cached,
                            }, null, 2),
                        },
                    ],
                };
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(result, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            logger.error('search_winget failed', {
                error: error instanceof Error ? error.message : String(error),
            });
            if (error instanceof GithubApiError && error.statusCode === 429) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                error: 'rate_limit_exceeded',
                                message: error.message,
                                suggestion: 'Configure a GitHub Personal Access Token (GITHUB_TOKEN environment variable) to increase rate limits from 60 to 5000 requests per hour.',
                            }, null, 2),
                        },
                    ],
                    isError: true,
                };
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: formatErrorForClient(error),
                    },
                ],
                isError: true,
            };
        }
    });
    // Register get_silent_install_args tool
    server.tool('get_silent_install_args', 'Get silent installation arguments for an application. Can look up by Winget package ID, installer type, or installer URL.', getSilentInstallArgsSchema.shape, async (args) => {
        logger.debug('Executing get_silent_install_args', { args });
        try {
            const validated = getSilentInstallArgsSchema.parse(args);
            if (!validated.package_id && !validated.installer_type && !validated.installer_url) {
                throw new ToolError('At least one of package_id, installer_type, or installer_url must be provided', 'get_silent_install_args');
            }
            const wingetService = getWingetService();
            const input = {
                packageId: validated.package_id,
                installerType: validated.installer_type,
                installerUrl: validated.installer_url,
            };
            const result = await wingetService.getSilentInstallArgs(input);
            // Add helpful context based on confidence level
            let recommendation = '';
            switch (result.args.confidence) {
                case 'verified':
                    recommendation =
                        'These arguments are verified from the Winget manifest and should work reliably.';
                    break;
                case 'high':
                    recommendation =
                        'These arguments are based on known installer type patterns and typically work well.';
                    break;
                case 'medium':
                    recommendation =
                        'These arguments are based on heuristics. Test them in a lab environment before deployment.';
                    break;
                case 'low':
                    recommendation =
                        'These are generic fallback arguments. Testing is strongly recommended as they may not work.';
                    break;
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            ...result,
                            recommendation,
                        }, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            logger.error('get_silent_install_args failed', {
                error: error instanceof Error ? error.message : String(error),
            });
            return {
                content: [
                    {
                        type: 'text',
                        text: formatErrorForClient(error),
                    },
                ],
                isError: true,
            };
        }
    });
    logger.info('Registered Winget tools', {
        tools: ['search_winget', 'get_silent_install_args'],
    });
    // Register get_psadt_template tool
    server.tool('get_psadt_template', 'Generate a PSADT v4 deployment script template for a specific application and installer type. Returns a complete deployment script with customization points.', getPsadtTemplateSchema.shape, async (args) => {
        logger.debug('Executing get_psadt_template', { args });
        try {
            const validated = getPsadtTemplateSchema.parse(args);
            const psadtService = getPsadtService();
            const input = {
                applicationName: validated.application_name,
                applicationVendor: validated.application_vendor,
                applicationVersion: validated.application_version,
                installerType: validated.installer_type,
                complexity: validated.complexity,
                installerFileName: validated.installer_file_name,
                silentArgs: validated.silent_args,
                uninstallArgs: validated.uninstall_args,
                productCode: validated.product_code,
                closeApps: validated.close_apps,
                includeUninstall: validated.include_uninstall,
                includeRepair: validated.include_repair,
                transformFile: validated.transform_file,
                msiProperties: validated.msi_properties,
                rebootBehavior: validated.reboot_behavior,
            };
            const result = await psadtService.generateTemplate(input);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: result.success,
                            metadata: result.template.metadata,
                            script: result.template.script,
                            additionalFiles: result.template.files.map((f) => ({
                                path: f.path,
                                description: f.description,
                                content: f.content,
                            })),
                            customizationPoints: result.template.customizationPoints,
                            recommendations: result.recommendations,
                        }, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            logger.error('get_psadt_template failed', {
                error: error instanceof Error ? error.message : String(error),
            });
            return {
                content: [
                    {
                        type: 'text',
                        text: formatErrorForClient(error),
                    },
                ],
                isError: true,
            };
        }
    });
    logger.info('Registered PSADT tools', {
        tools: ['get_psadt_template'],
    });
    // Register validate_package tool
    server.tool('validate_package', 'Validate a PSADT deployment script against best practices, Intune requirements, and security rules. Returns issues with line numbers and suggestions.', validatePackageSchema.shape, async (args) => {
        logger.debug('Executing validate_package', {
            level: args.level,
            environment: args.environment,
            scriptLength: typeof args.script === 'string' ? args.script.length : 0,
        });
        try {
            const validated = validatePackageSchema.parse(args);
            const validationService = getValidationService();
            const input = {
                script: validated.script,
                level: validated.level,
                environment: validated.environment,
                categories: validated.categories,
            };
            const result = await validationService.validatePackage(input);
            // Format output for readability
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: result.success,
                            isValid: result.result.isValid,
                            score: result.result.score,
                            summary: result.result.summary,
                            level: result.result.level,
                            environment: result.result.environment,
                            counts: {
                                errors: result.result.errorCount,
                                warnings: result.result.warningCount,
                                info: result.result.infoCount,
                                passed: result.result.passedChecks.length,
                            },
                            issues: result.result.issues.map((issue) => ({
                                rule: issue.ruleId,
                                severity: issue.severity,
                                category: issue.category,
                                message: issue.message,
                                line: issue.lineNumber,
                                lineContent: issue.lineContent,
                                suggestion: issue.suggestion,
                            })),
                            passedChecks: result.result.passedChecks.map((check) => ({
                                rule: check.ruleId,
                                name: check.ruleName,
                                category: check.category,
                            })),
                        }, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            logger.error('validate_package failed', {
                error: error instanceof Error ? error.message : String(error),
            });
            return {
                content: [
                    {
                        type: 'text',
                        text: formatErrorForClient(error),
                    },
                ],
                isError: true,
            };
        }
    });
    logger.info('Registered Validation tools', {
        tools: ['validate_package'],
    });
    // Register generate_intune_detection tool
    server.tool('generate_intune_detection', 'Generate Intune detection rules for Win32 app deployments. Supports file, registry, MSI product code, and PowerShell script detection methods. Returns both Intune Graph API JSON and equivalent PowerShell scripts.', generateIntuneDetectionSchema.shape, async (args) => {
        logger.debug('Executing generate_intune_detection', {
            detectionType: args.detection_type,
        });
        try {
            const validated = generateIntuneDetectionSchema.parse(args);
            const detectionType = validated.detection_type;
            // Validate that the required parameters for the detection type are provided
            if (detectionType === 'file' && !validated.file) {
                throw new ToolError('file parameters are required when detection_type is "file"', 'generate_intune_detection');
            }
            if (detectionType === 'registry' && !validated.registry) {
                throw new ToolError('registry parameters are required when detection_type is "registry"', 'generate_intune_detection');
            }
            if (detectionType === 'msi' && !validated.msi) {
                throw new ToolError('msi parameters are required when detection_type is "msi"', 'generate_intune_detection');
            }
            if (detectionType === 'script' && !validated.script) {
                throw new ToolError('script parameters are required when detection_type is "script"', 'generate_intune_detection');
            }
            const detectionService = getDetectionService();
            // Build input for detection service (convert snake_case to camelCase)
            const input = {
                detectionType,
            };
            if (validated.file) {
                input.file = {
                    path: validated.file.path,
                    fileOrFolderName: validated.file.file_or_folder_name,
                    check32BitOn64System: validated.file.check_32bit_on_64system,
                    detectionType: validated.file.detection_type,
                    operator: validated.file.operator,
                    detectionValue: validated.file.detection_value,
                };
            }
            if (validated.registry) {
                input.registry = {
                    keyPath: validated.registry.key_path,
                    valueName: validated.registry.value_name,
                    check32BitOn64System: validated.registry.check_32bit_on_64system,
                    detectionType: validated.registry.detection_type,
                    operator: validated.registry.operator,
                    detectionValue: validated.registry.detection_value,
                };
            }
            if (validated.msi) {
                input.msi = {
                    productCode: validated.msi.product_code,
                    productVersionOperator: validated.msi.product_version_operator,
                    productVersion: validated.msi.product_version,
                };
            }
            if (validated.script) {
                input.script = {
                    applicationName: validated.script.application_name,
                    installPath: validated.script.install_path,
                    fileName: validated.script.file_name,
                    version: validated.script.version,
                    operator: validated.script.operator,
                    registryKey: validated.script.registry_key,
                    registryValueName: validated.script.registry_value_name,
                };
            }
            const result = await detectionService.generateDetection(input);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: result.success,
                            detectionMethod: result.detectionMethod,
                            configuration: result.configuration,
                            intuneJson: result.intuneJson,
                            powershellScript: result.powershellScript,
                            recommendations: result.recommendations,
                        }, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            logger.error('generate_intune_detection failed', {
                error: error instanceof Error ? error.message : String(error),
            });
            return {
                content: [
                    {
                        type: 'text',
                        text: formatErrorForClient(error),
                    },
                ],
                isError: true,
            };
        }
    });
    logger.info('Registered Detection tools', {
        tools: ['generate_intune_detection'],
    });
    // Register download_installer tool
    const downloadInstallerSchema = z.object({
        package_id: z.string().min(1).describe('Winget package ID (e.g., "Google.Chrome", "Mozilla.Firefox")'),
        version: z.string().optional().describe('Specific version to download (e.g., "120.0.6099.109"). If not specified, downloads the latest version.'),
        architecture: z
            .enum(['x64', 'x86', 'arm64', 'neutral'])
            .optional()
            .describe('Preferred architecture. Defaults to x64, falls back to x86 if not available.'),
        output_directory: z.string().min(1).describe('Directory path where the installer file will be saved (e.g., "C:\\Packages\\Chrome\\Files")'),
        output_filename: z.string().optional().describe('Custom filename for the downloaded installer. If not specified, uses the original filename from the URL.'),
    });
    server.tool('download_installer', 'Download an application installer from the Winget repository and save it to the specified directory (typically the PSADT Files folder). Verifies file integrity using SHA256 hash from the Winget manifest.', downloadInstallerSchema.shape, async (args) => {
        logger.debug('Executing download_installer', {
            packageId: args.package_id,
            version: args.version,
            architecture: args.architecture,
        });
        try {
            const validated = downloadInstallerSchema.parse(args);
            const downloadService = getDownloadService();
            const input = {
                packageId: validated.package_id,
                version: validated.version,
                architecture: validated.architecture,
                outputDirectory: validated.output_directory,
                outputFilename: validated.output_filename,
            };
            const result = await downloadService.downloadInstaller(input);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: result.success,
                            package: {
                                id: result.packageId,
                                name: result.packageName,
                                version: result.packageVersion,
                                publisher: result.publisher,
                            },
                            file: {
                                path: result.filePath,
                                name: result.fileName,
                                size: result.fileSize,
                                sizeFormatted: formatBytes(result.fileSize),
                                sha256: result.sha256,
                                verified: result.verified,
                                installerType: result.installerType,
                            },
                            download: {
                                url: result.downloadedFrom,
                                duration: result.duration,
                                durationFormatted: `${(result.duration / 1000).toFixed(1)}s`,
                            },
                            warning: result.warning,
                        }, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            logger.error('download_installer failed', {
                error: error instanceof Error ? error.message : String(error),
            });
            if (error instanceof HashVerificationError) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                error: 'hash_verification_failed',
                                message: error.message,
                                expected: error.expectedHash,
                                actual: error.actualHash,
                                suggestion: 'The downloaded file does not match the expected checksum. Try downloading again. If the problem persists, the Winget manifest may be outdated.',
                            }, null, 2),
                        },
                    ],
                    isError: true,
                };
            }
            if (error instanceof DownloadError) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                error: 'download_failed',
                                message: error.message,
                                url: error.url,
                                statusCode: error.statusCode,
                                suggestion: error.statusCode === 404
                                    ? 'The package or version was not found. Verify the package ID and version are correct.'
                                    : 'Check your network connection and try again.',
                            }, null, 2),
                        },
                    ],
                    isError: true,
                };
            }
            if (error instanceof GithubApiError && error.statusCode === 429) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                error: 'rate_limit_exceeded',
                                message: error.message,
                                suggestion: 'Configure a GitHub Personal Access Token (GITHUB_TOKEN environment variable) to increase rate limits.',
                            }, null, 2),
                        },
                    ],
                    isError: true,
                };
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: formatErrorForClient(error),
                    },
                ],
                isError: true,
            };
        }
    });
    logger.info('Registered Download tools', {
        tools: ['download_installer'],
    });
}
function formatBytes(bytes) {
    if (bytes === 0)
        return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
//# sourceMappingURL=tools.js.map