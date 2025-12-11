// Package App Workflow - Guided workflow to create complete Intune-ready packages

import { getLogger } from '../utils/logger.js';
import { getWingetService } from '../services/winget.js';
import { getPsadtService } from '../services/psadt.js';
import { getValidationService } from '../services/validation.js';
import { getDetectionService } from '../services/detection.js';
import type {
  PackageAppArguments,
  PackageAppResult,
  WingetLookupResult,
  DetectionRuleConfig,
} from '../types/prompts.js';
import type { InstallerType, WingetManifest } from '../types/winget.js';
import type { TemplateComplexity } from '../types/psadt.js';

const logger = getLogger().child({ workflow: 'package-app' });

/**
 * Parse raw arguments string into structured arguments
 */
export function parsePackageAppArgs(rawArgs: Record<string, string>): PackageAppArguments {
  const args: PackageAppArguments = {
    applicationName: rawArgs['application-name'] || rawArgs['applicationName'] || rawArgs['app'] || '',
    quick: rawArgs['quick'] === 'true' || rawArgs['quick'] === '',
    noValidate: rawArgs['no-validate'] === 'true' || rawArgs['noValidate'] === 'true',
    architecture: (rawArgs['architecture'] || rawArgs['arch']) as PackageAppArguments['architecture'],
    complexity: (rawArgs['complexity'] || 'standard') as TemplateComplexity,
    environment: (rawArgs['environment'] || 'intune') as PackageAppArguments['environment'],
    outputDirectory: rawArgs['output-directory'] || rawArgs['outputDirectory'],
  };

  return args;
}

/**
 * Look up application in Winget repository
 */
async function lookupWinget(applicationName: string): Promise<WingetLookupResult> {
  const wingetService = getWingetService();

  try {
    // First try exact match
    let searchResult = await wingetService.searchPackages({
      query: applicationName,
      exactMatch: true,
      includeVersions: false,
      limit: 1,
    });

    // If no exact match, try broader search
    if (searchResult.totalResults === 0) {
      searchResult = await wingetService.searchPackages({
        query: applicationName,
        exactMatch: false,
        includeVersions: false,
        limit: 5,
      });
    }

    if (searchResult.totalResults === 0) {
      return {
        found: false,
        alternatives: [],
      };
    }

    const firstResult = searchResult.results[0]!;

    // Get full manifest for details
    const manifest = await wingetService.getManifest(firstResult.packageIdentifier, firstResult.latestVersion);

    // Get silent install args
    const silentArgsResult = await wingetService.getSilentInstallArgs({
      packageId: firstResult.packageIdentifier,
      installerType: manifest?.installers?.[0]?.installerType,
    });

    const primaryInstaller = manifest?.installers?.[0];

    const result: WingetLookupResult = {
      found: true,
      packageId: firstResult.packageIdentifier,
      packageName: firstResult.packageName,
      publisher: firstResult.publisher,
      version: firstResult.latestVersion,
      description: firstResult.description,
      installerType: primaryInstaller?.installerType,
      installerUrl: primaryInstaller?.installerUrl,
      productCode: primaryInstaller?.productCode,
      silentArgs: silentArgsResult.args.silent,
      uninstallArgs: silentArgsResult.args.uninstall,
    };

    // Add alternatives if there were multiple results
    if (searchResult.totalResults > 1) {
      result.alternatives = searchResult.results.slice(1).map(r => ({
        packageId: r.packageIdentifier,
        packageName: r.packageName,
        version: r.latestVersion,
      }));
    }

    return result;
  } catch (error) {
    logger.error('Winget lookup failed', { applicationName, error });
    return {
      found: false,
      alternatives: [],
    };
  }
}

/**
 * Generate PSADT script based on lookup results
 */
async function generateScript(
  lookup: WingetLookupResult,
  complexity: TemplateComplexity
): Promise<{ script: string; recommendations: string[] } | undefined> {
  if (!lookup.found || !lookup.packageName) {
    return undefined;
  }

  const psadtService = getPsadtService();

  try {
    const result = await psadtService.generateTemplate({
      applicationName: lookup.packageName,
      applicationVendor: lookup.publisher || 'Unknown',
      applicationVersion: lookup.version || '1.0.0',
      installerType: lookup.installerType || 'exe',
      complexity,
      silentArgs: lookup.silentArgs,
      uninstallArgs: lookup.uninstallArgs,
      productCode: lookup.productCode,
      includeUninstall: true,
    });

    return {
      script: result.template.script,
      recommendations: result.recommendations,
    };
  } catch (error) {
    logger.error('Script generation failed', { error });
    return undefined;
  }
}

/**
 * Generate Intune detection rule
 */
async function generateDetection(
  lookup: WingetLookupResult
): Promise<DetectionRuleConfig | undefined> {
  if (!lookup.found) {
    return undefined;
  }

  const detectionService = getDetectionService();

  try {
    // Determine best detection method
    const recommendation = detectionService.recommendDetectionType(
      lookup.installerType,
      !!lookup.productCode,
      true // Assume version file available for exe
    );

    let detectionResult;

    if (lookup.productCode && (recommendation.recommended === 'msi' || lookup.installerType === 'msi')) {
      // Use MSI product code detection
      detectionResult = await detectionService.generateDetection({
        detectionType: 'msi',
        msi: {
          productCode: lookup.productCode,
          productVersion: lookup.version,
          productVersionOperator: 'greaterThanOrEqual',
        },
      });
    } else if (lookup.installerType === 'msix') {
      // Use registry detection for MSIX
      detectionResult = await detectionService.generateDetection({
        detectionType: 'registry',
        registry: {
          keyPath: `HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\{${lookup.packageId}}`,
          detectionType: 'exists',
        },
      });
    } else {
      // Default to script detection
      detectionResult = await detectionService.generateDetection({
        detectionType: 'script',
        script: {
          applicationName: lookup.packageName || lookup.packageId || 'Application',
          version: lookup.version,
        },
      });
    }

    return {
      type: detectionResult.configuration.type as DetectionRuleConfig['type'],
      config: detectionResult.configuration.details as unknown as Record<string, unknown>,
      powershellScript: detectionResult.powershellScript,
      intuneJson: detectionResult.intuneJson as unknown as Record<string, unknown> | null,
    };
  } catch (error) {
    logger.error('Detection generation failed', { error });
    return undefined;
  }
}

/**
 * Validate the generated script
 */
async function validateScript(
  script: string,
  environment: string
): Promise<PackageAppResult['validation']> {
  const validationService = getValidationService();

  try {
    const result = await validationService.validatePackage({
      script,
      level: 'standard',
      environment: environment as any,
      categories: ['structure', 'psadt', 'intune', 'security'],
    });

    return {
      isValid: result.result.isValid,
      score: result.result.score,
      errorCount: result.result.errorCount,
      warningCount: result.result.warningCount,
      summary: result.result.summary,
      issues: result.result.issues.slice(0, 5).map(i => ({
        severity: i.severity,
        message: i.message,
        suggestion: i.suggestion,
      })),
    };
  } catch (error) {
    logger.error('Validation failed', { error });
    return undefined;
  }
}

/**
 * Execute the package-app workflow
 */
export async function executePackageAppWorkflow(
  args: PackageAppArguments
): Promise<PackageAppResult> {
  logger.info('Starting package-app workflow', { args });

  const result: PackageAppResult = {
    status: 'error',
    message: '',
    nextSteps: [],
    lookup: { found: false },
  };

  // Step 1: Winget lookup
  if (!args.applicationName) {
    result.message = 'Application name is required';
    result.errors = ['No application name provided'];
    return result;
  }

  result.lookup = await lookupWinget(args.applicationName);

  if (!result.lookup.found) {
    result.status = 'partial';
    result.message = `Application "${args.applicationName}" not found in Winget repository`;
    result.warnings = ['Application not found in Winget. You may need to manually specify package details.'];
    result.nextSteps = [
      'Search with a different name or package ID',
      'Manually create PSADT script with application details',
      'Check Winget repository at https://github.com/microsoft/winget-pkgs',
    ];
    return result;
  }

  // Step 2: Generate PSADT script
  const complexity = args.complexity || (args.quick ? 'basic' : 'standard');
  const scriptResult = await generateScript(result.lookup, complexity);

  if (scriptResult) {
    result.script = scriptResult.script;
  }

  // Step 3: Generate detection rule
  result.detection = await generateDetection(result.lookup);

  // Step 4: Validate (unless --no-validate or --quick)
  if (result.script && !args.noValidate && !args.quick) {
    result.validation = await validateScript(result.script, args.environment || 'intune');
  }

  // Step 5: Build package structure
  if (result.script && result.detection) {
    result.package = {
      deployScript: result.script,
      detectionScript: result.detection.powershellScript,
      detectionRule: result.detection,
      packageStructureDoc: generatePackageStructureDoc(result.lookup),
      recommendations: scriptResult?.recommendations || [],
    };
  }

  // Step 6: Create package on disk if output_directory specified
  if (args.outputDirectory && result.script) {
    try {
      const packageCreation = await createPackageOnDisk(args.outputDirectory, result);
      result.packageCreation = packageCreation;
    } catch (error) {
      logger.error('Failed to create package on disk', { error });
      result.warnings = result.warnings || [];
      result.warnings.push(`Failed to create package files: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Determine status
  if (result.validation && !result.validation.isValid) {
    result.status = 'partial';
    result.message = `Package created with validation issues: ${result.validation.summary}`;
    result.warnings = result.validation.issues?.map(i => `${i.severity}: ${i.message}`);
  } else if (result.script && result.detection) {
    result.status = 'success';
    result.message = `Successfully created Intune package for ${result.lookup.packageName} v${result.lookup.version}`;
    if (result.packageCreation) {
      result.message += ` at ${result.packageCreation.outputDirectory}`;
    }
  } else {
    result.status = 'partial';
    result.message = 'Package partially created - some components could not be generated';
  }

  // Generate next steps
  result.nextSteps = generateNextSteps(result, args.outputDirectory);

  logger.info('Package-app workflow completed', { status: result.status });
  return result;
}

/**
 * Generate package structure documentation
 */
function generatePackageStructureDoc(lookup: WingetLookupResult): string {
  const safeName = (lookup.packageName || 'App').replace(/[^a-zA-Z0-9]/g, '');
  return `# ${lookup.packageName} ${lookup.version} Package Structure

## Package Information
- **Name**: ${lookup.packageName}
- **Vendor**: ${lookup.publisher}
- **Version**: ${lookup.version}
- **Installer Type**: ${lookup.installerType || 'Unknown'}
- **Package ID**: ${lookup.packageId}

## Folder Layout

\`\`\`
${lookup.publisher}_${safeName}_${lookup.version}/
├── PSAppDeployToolkit/           # PSADT module files
│   ├── PSAppDeployToolkit.psd1
│   └── PSAppDeployToolkit.psm1
├── AppDeployToolkit/
│   ├── Deploy-Application.ps1    # Main deployment script
│   └── Files/                    # Installer files
│       └── [Download installer from: ${lookup.installerUrl || 'Not available'}]
├── Detection.ps1                 # Intune detection script
└── PACKAGE_STRUCTURE.md          # This file
\`\`\`

## Intune Configuration

### Install Command
\`\`\`
Deploy-Application.exe -DeploymentType Install -DeployMode Silent
\`\`\`

### Uninstall Command
\`\`\`
Deploy-Application.exe -DeploymentType Uninstall -DeployMode Silent
\`\`\`

### Detection Method
Use the provided Detection.ps1 script or configure:
${lookup.productCode ? `- MSI Product Code: ${lookup.productCode}` : '- Registry or file-based detection (see generated detection script)'}

## Silent Installation Arguments
\`\`\`
${lookup.silentArgs || 'Not available - test manually'}
\`\`\`

---
Generated by Intune Packaging Assistant MCP Server
`;
}

/**
 * Create package files on disk with PSADT toolkit
 */
async function createPackageOnDisk(
  outputDirectory: string,
  result: PackageAppResult
): Promise<{ outputDirectory: string; scriptPath: string; copiedFiles: string[] }> {
  const { existsSync, mkdirSync, writeFileSync, cpSync, readdirSync, statSync } = await import('node:fs');
  const { join, dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');

  const copiedFiles: string[] = [];

  // Get the path to ReferenceKnowledge relative to this file
  const currentFilePath = fileURLToPath(import.meta.url);
  const projectRoot = join(dirname(currentFilePath), '..', '..');
  const toolkitSourcePath = join(projectRoot, 'ReferenceKnowledge', 'PSAppDeployToolkit_Template_v4');

  // Create output directory if it doesn't exist
  if (!existsSync(outputDirectory)) {
    mkdirSync(outputDirectory, { recursive: true });
  }

  // Copy toolkit directories
  const directoriesToCopy = ['PSAppDeployToolkit', 'Config', 'Assets', 'Files'];
  for (const dir of directoriesToCopy) {
    const srcDir = join(toolkitSourcePath, dir);
    const destDir = join(outputDirectory, dir);
    if (existsSync(srcDir)) {
      cpSync(srcDir, destDir, { recursive: true });
      copiedFiles.push(`${dir}/`);
    }
  }

  // Copy frontend files (Invoke-AppDeployToolkit.exe) from PSAppDeployToolkit/Frontend/v4
  const frontendSrcDir = join(toolkitSourcePath, 'PSAppDeployToolkit', 'Frontend', 'v4');
  if (existsSync(frontendSrcDir)) {
    const frontendFiles = readdirSync(frontendSrcDir);
    for (const file of frontendFiles) {
      const srcFile = join(frontendSrcDir, file);
      const destFile = join(outputDirectory, file);
      // Only copy files, not directories (PSAppDeployToolkit.Extensions is a directory)
      if (statSync(srcFile).isFile()) {
        cpSync(srcFile, destFile);
        copiedFiles.push(file);
      }
    }
  }

  // Save the generated deployment script
  const scriptPath = join(outputDirectory, 'Invoke-AppDeployToolkit.ps1');
  if (result.script) {
    writeFileSync(scriptPath, result.script, 'utf-8');
    copiedFiles.push('Invoke-AppDeployToolkit.ps1 (generated)');
  }

  // Save the detection script
  if (result.detection?.powershellScript) {
    const detectionPath = join(outputDirectory, 'Detection.ps1');
    writeFileSync(detectionPath, result.detection.powershellScript, 'utf-8');
    copiedFiles.push('Detection.ps1 (generated)');
  }

  return {
    outputDirectory,
    scriptPath,
    copiedFiles,
  };
}

/**
 * Generate recommended next steps based on workflow result
 */
function generateNextSteps(result: PackageAppResult, outputDirectory?: string): string[] {
  const steps: string[] = [];

  if (result.status === 'success') {
    if (result.packageCreation) {
      // Package was created on disk with toolkit files
      steps.push(`Download the installer and place it in: ${result.packageCreation.outputDirectory}\\Files\\`);
      steps.push('Review and customize Invoke-AppDeployToolkit.ps1 as needed');
      steps.push('Test the package locally before uploading to Intune');
      steps.push('Create the .intunewin package using the Microsoft Win32 Content Prep Tool');
      steps.push('Upload to Intune and configure assignments');
    } else if (outputDirectory) {
      // Output directory was specified but creation failed
      steps.push('Package files could not be created - check warnings above');
      steps.push('Use get_psadt_template tool with output_directory to create the package structure');
    } else {
      // No output directory - provide guidance on how to create package
      steps.push('Use get_psadt_template with output_directory parameter to create a complete package with PSADT toolkit files');
      steps.push('Or manually: download installer and set up PSADT package structure');
      steps.push('Test the package locally before uploading to Intune');
      steps.push('Create the .intunewin package using the Microsoft Win32 Content Prep Tool');
      steps.push('Upload to Intune and configure assignments');
    }
  } else if (result.status === 'partial') {
    if (result.validation && !result.validation.isValid) {
      steps.push('Address the validation issues in the generated script');
    }
    if (!result.script) {
      steps.push('Manually create the PSADT deployment script');
    }
    if (!result.detection) {
      steps.push('Create a detection rule for Intune');
    }
    steps.push('Review any warnings and make necessary adjustments');
  }

  if (result.lookup.alternatives && result.lookup.alternatives.length > 0) {
    steps.push(`Consider alternative packages: ${result.lookup.alternatives.map(a => a.packageId).join(', ')}`);
  }

  return steps;
}

/**
 * Format workflow result as user-friendly text
 */
export function formatPackageAppResult(result: PackageAppResult): string {
  const lines: string[] = [];

  // Header
  lines.push(`## Package Creation ${result.status === 'success' ? 'Complete' : result.status === 'partial' ? 'Partial' : 'Failed'}`);
  lines.push('');
  lines.push(result.message);
  lines.push('');

  // Lookup results
  if (result.lookup.found) {
    lines.push('### Application Details');
    lines.push(`- **Package ID**: ${result.lookup.packageId}`);
    lines.push(`- **Name**: ${result.lookup.packageName}`);
    lines.push(`- **Publisher**: ${result.lookup.publisher}`);
    lines.push(`- **Version**: ${result.lookup.version}`);
    lines.push(`- **Installer Type**: ${result.lookup.installerType || 'Unknown'}`);
    if (result.lookup.description) {
      lines.push(`- **Description**: ${result.lookup.description}`);
    }
    lines.push('');
  }

  // Validation summary
  if (result.validation) {
    lines.push('### Validation Results');
    lines.push(`- **Status**: ${result.validation.isValid ? 'Passed' : 'Issues Found'}`);
    lines.push(`- **Score**: ${result.validation.score}/100`);
    lines.push(`- **Summary**: ${result.validation.summary}`);
    if (result.validation.issues && result.validation.issues.length > 0) {
      lines.push('');
      lines.push('**Issues:**');
      result.validation.issues.forEach(issue => {
        lines.push(`- [${issue.severity.toUpperCase()}] ${issue.message}`);
        if (issue.suggestion) {
          lines.push(`  - Suggestion: ${issue.suggestion}`);
        }
      });
    }
    lines.push('');
  }

  // Warnings and errors
  if (result.warnings && result.warnings.length > 0) {
    lines.push('### Warnings');
    result.warnings.forEach(w => lines.push(`- ${w}`));
    lines.push('');
  }

  if (result.errors && result.errors.length > 0) {
    lines.push('### Errors');
    result.errors.forEach(e => lines.push(`- ${e}`));
    lines.push('');
  }

  // Next steps
  if (result.nextSteps.length > 0) {
    lines.push('### Next Steps');
    result.nextSteps.forEach((step, i) => lines.push(`${i + 1}. ${step}`));
    lines.push('');
  }

  // Package creation info
  if (result.packageCreation) {
    lines.push('### Package Created');
    lines.push(`- **Output Directory**: ${result.packageCreation.outputDirectory}`);
    lines.push('- **Files Created**:');
    result.packageCreation.copiedFiles.forEach(f => lines.push(`  - ${f}`));
    lines.push('');
    lines.push('*PSADT toolkit files have been automatically included. Just add your installer to the Files folder.*');
    lines.push('');
  }

  // Generated content references
  if (result.script) {
    lines.push('### Generated Files');
    if (result.packageCreation) {
      lines.push(`- Invoke-AppDeployToolkit.ps1 (saved to ${result.packageCreation.scriptPath})`);
    } else {
      lines.push('- Invoke-AppDeployToolkit.ps1 (PSADT deployment script)');
    }
    if (result.detection) {
      lines.push('- Detection.ps1 (Intune detection script)');
    }
    lines.push('');
    if (!result.packageCreation) {
      lines.push('*The generated scripts are included below for your review.*');
    }
  }

  return lines.join('\n');
}
