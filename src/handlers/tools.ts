import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { existsSync, mkdirSync, writeFileSync, cpSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getLogger } from '../utils/logger.js';
import { formatErrorForClient, ToolError, GithubApiError } from '../utils/errors.js';
import { validateOutputPath, validateReadPath } from '../utils/path-validation.js';
import { getWingetService } from '../services/winget.js';
import { getPsadtService } from '../services/psadt.js';
import { getValidationService } from '../services/validation.js';
import { getDetectionService } from '../services/detection.js';
import { getIntunePublisherService } from '../services/intune-publisher.js';
import {
  searchWingetSchema,
  getSilentInstallArgsSchema,
  getPsadtTemplateSchema,
  validatePackageSchema,
  generateIntuneDetectionSchema,
  verifyPsadtFunctionsSchema,
  publishToIntuneSchema,
} from '../schemas/tools.js';
import type {
  SearchWingetInput,
  GetSilentInstallArgsInput,
  InstallerType,
  Architecture,
} from '../types/winget.js';
import type { GetPsadtTemplateInput } from '../types/psadt.js';
import type { ValidatePackageInput, VerifyPsadtFunctionsInput } from '../types/validation.js';
import type { GenerateIntuneDetectionInput, DetectionType, ComparisonOperator, IntuneDetectionRule } from '../types/intune.js';
import type { PublishToIntuneInput } from '../types/intune-publisher.js';

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
    'ALWAYS use this tool to generate PSADT v4.1.8 deployment scripts. DO NOT write PSADT scripts manually - they will have incorrect function names. This tool generates correct scripts using Open-ADTSession and Close-ADTSession. Returns a complete deployment script with customization points. If output_directory is specified, creates a complete package with toolkit files.',
    getPsadtTemplateSchema.shape,
    async (args) => {
      logger.debug('Executing get_psadt_template', { args });

      try {
        const validated = getPsadtTemplateSchema.parse(args);
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

        // If output_directory is specified, copy toolkit files and save the script
        let packageCreated = false;
        let outputPath: string | undefined;
        let copiedFiles: string[] = [];

        if (validated.output_directory) {
          // Validate output path before any file system operations
          const { loadConfig } = await import('../config/loader.js');
          const serverConfig = loadConfig();
          validateOutputPath(
            validated.output_directory,
            'get_psadt_template',
            serverConfig.security?.allowedOutputDirs
          );

          // Get the path to toolkit files relative to this compiled file
          // When running from dist/handlers/tools.js, go up to dist/ then into knowledge/v4github
          const currentFilePath = fileURLToPath(import.meta.url);
          const distDir = join(dirname(currentFilePath), '..');
          const toolkitSourcePath = join(distDir, 'knowledge', 'v4github');

          // Create output directory if it doesn't exist
          if (!existsSync(validated.output_directory)) {
            mkdirSync(validated.output_directory, { recursive: true });
          }

          // Copy toolkit directories
          const directoriesToCopy = ['PSAppDeployToolkit', 'Config', 'Assets', 'Files'];
          for (const dir of directoriesToCopy) {
            const srcDir = join(toolkitSourcePath, dir);
            const destDir = join(validated.output_directory, dir);
            if (existsSync(srcDir)) {
              cpSync(srcDir, destDir, { recursive: true });
              copiedFiles.push(dir);
            }
          }

          // Copy frontend files (Invoke-AppDeployToolkit.exe) from PSAppDeployToolkit/Frontend/v4
          const frontendSrcDir = join(toolkitSourcePath, 'PSAppDeployToolkit', 'Frontend', 'v4');
          if (existsSync(frontendSrcDir)) {
            const frontendFiles = readdirSync(frontendSrcDir);
            for (const file of frontendFiles) {
              const srcFile = join(frontendSrcDir, file);
              const destFile = join(validated.output_directory, file);
              // Only copy files, not directories (PSAppDeployToolkit.Extensions is a directory)
              if (statSync(srcFile).isFile()) {
                cpSync(srcFile, destFile);
                copiedFiles.push(file);
              }
            }
          }

          // Save the generated script
          outputPath = join(validated.output_directory, 'Invoke-AppDeployToolkit.ps1');
          writeFileSync(outputPath, result.template.script, 'utf-8');
          copiedFiles.push('Invoke-AppDeployToolkit.ps1 (generated)');

          packageCreated = true;
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
                  additionalFiles: result.template.files.map((f) => ({
                    path: f.path,
                    description: f.description,
                    content: f.content,
                  })),
                  customizationPoints: result.template.customizationPoints,
                  recommendations: result.recommendations,
                  ...(packageCreated
                    ? {
                        packageCreated: true,
                        outputDirectory: validated.output_directory,
                        scriptPath: outputPath,
                        copiedFiles,
                        nextSteps: [
                          'Add your installer file to the Files/ directory',
                          'Review and customize Invoke-AppDeployToolkit.ps1 as needed',
                          'Test the package locally before deploying to Intune',
                        ],
                      }
                    : {
                        toolkitInstructions: 'Specify output_directory to create a complete package with toolkit files, or manually copy from ReferenceKnowledge/PSAppDeployToolkit_Template_v4/',
                      }),
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

  // Register verify_psadt_functions tool
  server.tool(
    'verify_psadt_functions',
    'Verify that a PSADT script file uses only valid v4.1.8 function names. Use this after generating a package with get_psadt_template to ensure no invalid function names were introduced. Returns list of valid functions found, any invalid functions with suggested replacements, and parameter issues.',
    verifyPsadtFunctionsSchema.shape,
    async (args) => {
      logger.debug('Executing verify_psadt_functions', {
        filePath: args.file_path,
      });

      try {
        const validated = verifyPsadtFunctionsSchema.parse(args);

        // Validate file path before reading
        validateReadPath(validated.file_path, 'verify_psadt_functions');

        const validationService = getValidationService();

        const input: VerifyPsadtFunctionsInput = {
          filePath: validated.file_path,
        };

        const result = await validationService.verifyPsadtFunctions(input);

        if (!result.success) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  {
                    success: false,
                    error: result.error,
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
              text: JSON.stringify(
                {
                  success: true,
                  isValid: result.result?.isValid,
                  filePath: result.result?.filePath,
                  summary: result.result?.summary,
                  invalidFunctions: result.result?.invalidFunctions,
                  parameterIssues: result.result?.parameterIssues,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        logger.error('verify_psadt_functions failed', {
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

  logger.info('Registered PSADT verification tools', {
    tools: ['verify_psadt_functions'],
  });

  // Register publish_to_intune tool
  server.tool(
    'publish_to_intune',
    'Publish a Win32 application to Microsoft Intune via Graph API. Uploads .intunewin packages and creates Win32 LOB app definitions. Requires certificate-based service principal authentication configured via environment variables.',
    publishToIntuneSchema.shape,
    async (args) => {
      logger.debug('Executing publish_to_intune', {
        intunewinPath: args.intunewin_path,
        appName: args.app_name,
      });

      try {
        const validated = publishToIntuneSchema.parse(args);
        const publisherService = getIntunePublisherService();

        // Check if authentication is configured
        if (!publisherService.isConfigured()) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(
                  {
                    success: false,
                    error: 'Intune publishing is not configured',
                    message: 'Certificate-based authentication environment variables are not set',
                    required_variables: [
                      'AZURE_TENANT_ID - Your Entra ID tenant GUID',
                      'AZURE_CLIENT_ID - Service principal application ID',
                      'AZURE_CLIENT_CERTIFICATE_PATH - Path to PFX/PEM certificate',
                      'AZURE_CLIENT_CERTIFICATE_PASSWORD - Certificate password (optional)',
                    ],
                    setup_guide: [
                      '1. Register an app in Azure Entra ID',
                      '2. Generate or upload a certificate to the app registration',
                      '3. Grant "DeviceManagementApps.ReadWrite.All" API permission',
                      '4. Grant admin consent for the permission',
                      '5. Set the environment variables listed above',
                    ],
                  },
                  null,
                  2
                ),
              },
            ],
            isError: true,
          };
        }

        // Validate file paths before use
        validateReadPath(validated.intunewin_path, 'publish_to_intune');
        if (validated.logo_path) {
          validateReadPath(validated.logo_path, 'publish_to_intune');
        }

        const input: PublishToIntuneInput = {
          intunewinPath: validated.intunewin_path,
          appName: validated.app_name,
          appVersion: validated.app_version,
          appVendor: validated.app_vendor,
          description: validated.description,
          logoPath: validated.logo_path,
          skipLogo: validated.skip_logo,
          detectionRule: validated.detection_rule as IntuneDetectionRule | undefined,
          installCommand: validated.install_command,
          uninstallCommand: validated.uninstall_command,
        };

        const result = await publisherService.publishApp(input);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
          isError: !result.success,
        };
      } catch (error) {
        logger.error('publish_to_intune failed', {
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

  logger.info('Registered Intune publishing tools', {
    tools: ['publish_to_intune'],
  });
}
