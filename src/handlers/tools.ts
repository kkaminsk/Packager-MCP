import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getLogger } from '../utils/logger.js';
import { formatErrorForClient, ToolError, GithubApiError, DownloadError } from '../utils/errors.js';
import { getWingetService } from '../services/winget.js';
import { getPsadtService } from '../services/psadt.js';
import { getValidationService } from '../services/validation.js';
import { getDetectionService } from '../services/detection.js';
import { getPsadtDownloadService } from '../services/psadt-download.js';
import type {
  SearchWingetInput,
  GetSilentInstallArgsInput,
  InstallerType,
  Architecture,
} from '../types/winget.js';
import type { GetPsadtTemplateInput } from '../types/psadt.js';
import type { ValidatePackageInput } from '../types/validation.js';
import type { GenerateIntuneDetectionInput, DetectionType, ComparisonOperator } from '../types/intune.js';
import type { DownloadPsadtToolkitInput } from '../types/psadt-download.js';

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
  download_toolkit: z.boolean().optional().describe('Download the PSADT toolkit to the output directory. Requires output_directory to be specified.'),
  output_directory: z.string().optional().describe('Directory to save the generated script and toolkit files. Required when download_toolkit is true.'),
  toolkit_version: z.string().optional().describe('Specific PSADT toolkit version to download (e.g., "4.0.4"). Default: latest'),
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

export function registerToolHandlers(server: McpServer): void {
  const logger = getLogger().child({ handler: 'tools' });

  // Register search_winget tool
  server.tool(
    'search_winget',
    'Search the Winget package repository for application metadata including installer URLs, versions, and silent install arguments',
    searchWingetSchema.shape,
    async (args) => {
      logger.debug('Executing search_winget', { args });

      try {
        const validated = searchWingetSchema.parse(args);
        const wingetService = getWingetService();

        const input: SearchWingetInput = {
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
                type: 'text' as const,
                text: JSON.stringify(
                  {
                    query: result.query,
                    totalResults: 0,
                    message: `No packages found matching "${result.query}". Try a different search term or check the package ID.`,
                    cached: result.cached,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        logger.error('search_winget failed', {
          error: error instanceof Error ? error.message : String(error),
        });

        if (error instanceof GithubApiError && error.statusCode === 429) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  {
                    error: 'rate_limit_exceeded',
                    message: error.message,
                    suggestion:
                      'Configure a GitHub Personal Access Token (GITHUB_TOKEN environment variable) to increase rate limits from 60 to 5000 requests per hour.',
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: formatErrorForClient(error),
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Register get_silent_install_args tool
  server.tool(
    'get_silent_install_args',
    'Get silent installation arguments for an application. Can look up by Winget package ID, installer type, or installer URL.',
    getSilentInstallArgsSchema.shape,
    async (args) => {
      logger.debug('Executing get_silent_install_args', { args });

      try {
        const validated = getSilentInstallArgsSchema.parse(args);

        if (!validated.package_id && !validated.installer_type && !validated.installer_url) {
          throw new ToolError(
            'At least one of package_id, installer_type, or installer_url must be provided',
            'get_silent_install_args'
          );
        }

        const wingetService = getWingetService();

        const input: GetSilentInstallArgsInput = {
          packageId: validated.package_id,
          installerType: validated.installer_type as InstallerType | undefined,
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
              type: 'text' as const,
              text: JSON.stringify(
                {
                  ...result,
                  recommendation,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        logger.error('get_silent_install_args failed', {
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: formatErrorForClient(error),
            },
          ],
          isError: true,
        };
      }
    }
  );

  logger.info('Registered Winget tools', {
    tools: ['search_winget', 'get_silent_install_args'],
  });

  // Register get_psadt_template tool
  server.tool(
    'get_psadt_template',
    'Generate a PSADT v4 deployment script template for a specific application and installer type. Returns a complete deployment script with customization points. Optionally downloads the PSADT toolkit to create a complete package structure.',
    getPsadtTemplateSchema.shape,
    async (args) => {
      logger.debug('Executing get_psadt_template', { args });

      try {
        const validated = getPsadtTemplateSchema.parse(args);

        // Validate download_toolkit requirements
        if (validated.download_toolkit && !validated.output_directory) {
          throw new ToolError(
            'output_directory is required when download_toolkit is true',
            'get_psadt_template'
          );
        }

        const psadtService = getPsadtService();

        const input: GetPsadtTemplateInput = {
          applicationName: validated.application_name,
          applicationVendor: validated.application_vendor,
          applicationVersion: validated.application_version,
          installerType: validated.installer_type as InstallerType,
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

        // Handle toolkit download if requested
        let toolkitDownloadResult: {
          success: boolean;
          version: string;
          downloadedFrom: 'cache' | 'github';
          filesCount: number;
        } | undefined;
        let scriptSavedPath: string | undefined;

        if (validated.download_toolkit && validated.output_directory) {
          const psadtDownloadService = getPsadtDownloadService();

          const downloadResult = await psadtDownloadService.downloadToolkit({
            outputDirectory: validated.output_directory,
            version: validated.toolkit_version,
          });

          toolkitDownloadResult = {
            success: downloadResult.success,
            version: downloadResult.version,
            downloadedFrom: downloadResult.downloadedFrom,
            filesCount: downloadResult.files.length,
          };

          // Save the generated script to the output directory
          const { writeFileSync, existsSync, mkdirSync } = await import('node:fs');
          const { join } = await import('node:path');

          if (!existsSync(validated.output_directory)) {
            mkdirSync(validated.output_directory, { recursive: true });
          }

          scriptSavedPath = join(validated.output_directory, 'Invoke-AppDeployToolkit.ps1');
          writeFileSync(scriptSavedPath, result.template.script, 'utf-8');
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  success: result.success,
                  metadata: result.template.metadata,
                  script: result.template.script,
                  scriptSavedPath,
                  additionalFiles: result.template.files.map((f) => ({
                    path: f.path,
                    description: f.description,
                    content: f.content,
                  })),
                  customizationPoints: result.template.customizationPoints,
                  recommendations: result.recommendations,
                  toolkitDownload: toolkitDownloadResult,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        logger.error('get_psadt_template failed', {
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: formatErrorForClient(error),
            },
          ],
          isError: true,
        };
      }
    }
  );

  logger.info('Registered PSADT tools', {
    tools: ['get_psadt_template'],
  });

  // Register validate_package tool
  server.tool(
    'validate_package',
    'Validate a PSADT deployment script against best practices, Intune requirements, and security rules. Returns issues with line numbers and suggestions.',
    validatePackageSchema.shape,
    async (args) => {
      logger.debug('Executing validate_package', {
        level: args.level,
        environment: args.environment,
        scriptLength: typeof args.script === 'string' ? args.script.length : 0,
      });

      try {
        const validated = validatePackageSchema.parse(args);
        const validationService = getValidationService();

        const input: ValidatePackageInput = {
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
              type: 'text' as const,
              text: JSON.stringify(
                {
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
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        logger.error('validate_package failed', {
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: formatErrorForClient(error),
            },
          ],
          isError: true,
        };
      }
    }
  );

  logger.info('Registered Validation tools', {
    tools: ['validate_package'],
  });

  // Register generate_intune_detection tool
  server.tool(
    'generate_intune_detection',
    'Generate Intune detection rules for Win32 app deployments. Supports file, registry, MSI product code, and PowerShell script detection methods. Returns both Intune Graph API JSON and equivalent PowerShell scripts.',
    generateIntuneDetectionSchema.shape,
    async (args) => {
      logger.debug('Executing generate_intune_detection', {
        detectionType: args.detection_type,
      });

      try {
        const validated = generateIntuneDetectionSchema.parse(args);
        const detectionType = validated.detection_type as DetectionType;

        // Validate that the required parameters for the detection type are provided
        if (detectionType === 'file' && !validated.file) {
          throw new ToolError(
            'file parameters are required when detection_type is "file"',
            'generate_intune_detection'
          );
        }
        if (detectionType === 'registry' && !validated.registry) {
          throw new ToolError(
            'registry parameters are required when detection_type is "registry"',
            'generate_intune_detection'
          );
        }
        if (detectionType === 'msi' && !validated.msi) {
          throw new ToolError(
            'msi parameters are required when detection_type is "msi"',
            'generate_intune_detection'
          );
        }
        if (detectionType === 'script' && !validated.script) {
          throw new ToolError(
            'script parameters are required when detection_type is "script"',
            'generate_intune_detection'
          );
        }

        const detectionService = getDetectionService();

        // Build input for detection service (convert snake_case to camelCase)
        const input: GenerateIntuneDetectionInput = {
          detectionType,
        };

        if (validated.file) {
          input.file = {
            path: validated.file.path,
            fileOrFolderName: validated.file.file_or_folder_name,
            check32BitOn64System: validated.file.check_32bit_on_64system,
            detectionType: validated.file.detection_type as 'exists' | 'version' | 'sizeInMB' | 'modifiedDate' | undefined,
            operator: validated.file.operator as ComparisonOperator | undefined,
            detectionValue: validated.file.detection_value,
          };
        }

        if (validated.registry) {
          input.registry = {
            keyPath: validated.registry.key_path,
            valueName: validated.registry.value_name,
            check32BitOn64System: validated.registry.check_32bit_on_64system,
            detectionType: validated.registry.detection_type as 'exists' | 'string' | 'integer' | 'version' | undefined,
            operator: validated.registry.operator as ComparisonOperator | undefined,
            detectionValue: validated.registry.detection_value,
          };
        }

        if (validated.msi) {
          input.msi = {
            productCode: validated.msi.product_code,
            productVersionOperator: validated.msi.product_version_operator as ComparisonOperator | undefined,
            productVersion: validated.msi.product_version,
          };
        }

        if (validated.script) {
          input.script = {
            applicationName: validated.script.application_name,
            installPath: validated.script.install_path,
            fileName: validated.script.file_name,
            version: validated.script.version,
            operator: validated.script.operator as ComparisonOperator | undefined,
            registryKey: validated.script.registry_key,
            registryValueName: validated.script.registry_value_name,
          };
        }

        const result = await detectionService.generateDetection(input);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  success: result.success,
                  detectionMethod: result.detectionMethod,
                  configuration: result.configuration,
                  intuneJson: result.intuneJson,
                  powershellScript: result.powershellScript,
                  recommendations: result.recommendations,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        logger.error('generate_intune_detection failed', {
          error: error instanceof Error ? error.message : String(error),
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: formatErrorForClient(error),
            },
          ],
          isError: true,
        };
      }
    }
  );

  logger.info('Registered Detection tools', {
    tools: ['generate_intune_detection'],
  });

  // Register download_psadt_toolkit tool
  const downloadPsadtToolkitSchema = z.object({
    output_directory: z.string().min(1).describe('Directory path where the PSADT toolkit will be extracted (e.g., "C:\\Packages\\MyApp")'),
    version: z.string().optional().describe('Specific PSADT version to download (e.g., "4.0.4"). If not specified, downloads the latest version.'),
    include_extensions: z.boolean().optional().describe('Include the PSAppDeployToolkit.Extensions module. Default: false'),
  });

  server.tool(
    'download_psadt_toolkit',
    'Download the PSAppDeployToolkit from GitHub releases. Extracts the complete toolkit structure including module files, config, assets, and launcher. Supports version pinning for reproducible builds.',
    downloadPsadtToolkitSchema.shape,
    async (args) => {
      logger.debug('Executing download_psadt_toolkit', {
        outputDirectory: args.output_directory,
        version: args.version,
        includeExtensions: args.include_extensions,
      });

      try {
        const validated = downloadPsadtToolkitSchema.parse(args);
        const psadtDownloadService = getPsadtDownloadService();

        const input: DownloadPsadtToolkitInput = {
          outputDirectory: validated.output_directory,
          version: validated.version,
          includeExtensions: validated.include_extensions,
        };

        const result = await psadtDownloadService.downloadToolkit(input);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  success: result.success,
                  version: result.version,
                  outputDirectory: result.outputDirectory,
                  downloadedFrom: result.downloadedFrom,
                  releaseUrl: result.releaseUrl,
                  filesCount: result.files.length,
                  files: result.files.slice(0, 20), // Limit to first 20 files for readability
                  downloadSize: result.downloadSize,
                  downloadSizeFormatted: formatBytes(result.downloadSize),
                  duration: result.duration,
                  durationFormatted: `${(result.duration / 1000).toFixed(1)}s`,
                  note: result.files.length > 20
                    ? `Showing first 20 of ${result.files.length} files extracted.`
                    : undefined,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        logger.error('download_psadt_toolkit failed', {
          error: error instanceof Error ? error.message : String(error),
        });

        if (error instanceof GithubApiError && error.statusCode === 429) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  {
                    error: 'rate_limit_exceeded',
                    message: error.message,
                    suggestion:
                      'Configure a GitHub Personal Access Token (GITHUB_TOKEN environment variable) to increase rate limits from 60 to 5000 requests per hour.',
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          };
        }

        if (error instanceof GithubApiError && error.statusCode === 404) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  {
                    error: 'version_not_found',
                    message: error.message,
                    suggestion:
                      'Check available versions at https://github.com/PSAppDeployToolkit/PSAppDeployToolkit/releases',
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          };
        }

        if (error instanceof DownloadError) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  {
                    error: 'download_failed',
                    message: error.message,
                    url: error.url,
                    suggestion:
                      'For slow connections, download manually from https://github.com/PSAppDeployToolkit/PSAppDeployToolkit/releases',
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: formatErrorForClient(error),
            },
          ],
          isError: true,
        };
      }
    }
  );

  logger.info('Registered PSADT Download tools', {
    tools: ['download_psadt_toolkit'],
  });
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
