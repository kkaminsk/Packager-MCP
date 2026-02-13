import { z } from 'zod';

export const searchWingetSchema = z.object({
  query: z.string().min(1).describe('Search query - package name or ID'),
  exact_match: z.boolean().optional().describe('If true, only return exact package ID matches'),
  include_versions: z.boolean().optional().describe('If true, include version history'),
  limit: z.number().min(1).max(50).optional().describe('Maximum number of results (default: 10)'),
});

export const getSilentInstallArgsSchema = z.object({
  package_id: z.string().optional().describe('Winget package ID (e.g., "Google.Chrome")'),
  installer_type: z
    .enum(['msi', 'msix', 'exe', 'zip', 'inno', 'nullsoft', 'wix', 'burn', 'portable', 'unknown'])
    .optional()
    .describe('Installer type if known'),
  installer_url: z.string().url().optional().describe('Installer URL to detect type from'),
});

export const getPsadtTemplateSchema = z.object({
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
  output_directory: z.string().optional().describe('Directory to create the complete PSADT package. If specified, toolkit files will be copied from ReferenceKnowledge and the generated script will be saved.'),
});

export const validatePackageSchema = z.object({
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

export const comparisonOperatorEnum = z.enum([
  'equal',
  'notEqual',
  'greaterThan',
  'greaterThanOrEqual',
  'lessThan',
  'lessThanOrEqual',
]);

export const fileDetectionSchema = z.object({
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

export const registryDetectionSchema = z.object({
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

export const msiDetectionSchema = z.object({
  product_code: z
    .string()
    .regex(/^\{[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}\}$/)
    .describe('MSI product code GUID (e.g., "{xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx}")'),
  product_version_operator: comparisonOperatorEnum.optional().describe('Version comparison operator'),
  product_version: z.string().optional().describe('Version to compare against (e.g., "1.0.0")'),
});

export const scriptDetectionSchema = z.object({
  application_name: z.string().min(1).describe('Application name for the detection script'),
  install_path: z.string().optional().describe('Installation directory path'),
  file_name: z.string().optional().describe('Main executable file name'),
  version: z.string().optional().describe('Version requirement'),
  operator: comparisonOperatorEnum.optional().describe('Version comparison operator'),
  registry_key: z.string().optional().describe('Registry key to check (alternative to file)'),
  registry_value_name: z.string().optional().describe('Registry value name containing version'),
});

export const generateIntuneDetectionSchema = z.object({
  detection_type: z
    .enum(['file', 'registry', 'msi', 'script'])
    .describe('Type of detection rule to generate'),
  file: fileDetectionSchema.optional().describe('File detection parameters (required if detection_type is "file")'),
  registry: registryDetectionSchema.optional().describe('Registry detection parameters (required if detection_type is "registry")'),
  msi: msiDetectionSchema.optional().describe('MSI detection parameters (required if detection_type is "msi")'),
  script: scriptDetectionSchema.optional().describe('Script detection parameters (required if detection_type is "script")'),
});

export const verifyPsadtFunctionsSchema = z.object({
  file_path: z.string().min(1).describe('Path to the PSADT script file to verify (e.g., "C:\\\\Packages\\\\MyApp\\\\Invoke-AppDeployToolkit.ps1")'),
});

export const intuneDetectionRuleSchema = z.object({
  '@odata.type': z.string().describe('Intune detection rule OData type'),
}).passthrough();

export const publishToIntuneSchema = z.object({
  intunewin_path: z.string().min(1).describe('Path to the .intunewin package file'),
  app_name: z.string().max(256).optional().describe('Application display name (auto-populated from PSADT if not provided)'),
  app_version: z.string().max(50).optional().describe('Application version (auto-populated from PSADT if not provided)'),
  app_vendor: z.string().optional().describe('Application vendor/publisher (auto-populated from PSADT if not provided)'),
  description: z.string().max(10000).optional().describe('Application description (fetched via web search if not provided)'),
  logo_path: z.string().optional().describe('Path to app logo image (PNG or JPEG, 256x256 preferred)'),
  skip_logo: z.boolean().optional().describe('Skip logo fetching (default: false)'),
  detection_rule: intuneDetectionRuleSchema.optional().describe('Detection rule configuration (from generate_intune_detection output)'),
  install_command: z.string().optional().describe('Custom install command (defaults to PSADT command)'),
  uninstall_command: z.string().optional().describe('Custom uninstall command (defaults to PSADT command)'),
});
