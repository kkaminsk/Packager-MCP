// Publish to Intune Workflow - Guided workflow to publish Win32 apps to Intune

import { getLogger } from '../utils/logger.js';
import { getIntunePublisherService } from '../services/intune-publisher.js';
import { getGraphAuthService } from '../services/graph-auth.js';
import type { PublishToIntuneInput, PublishToIntuneOutput, IntuneAppCategory } from '../types/intune-publisher.js';
import type { IntuneDetectionRule } from '../types/intune.js';

const logger = getLogger().child({ workflow: 'publish-to-intune' });

/**
 * Arguments for the publish-to-intune workflow
 */
export interface PublishToIntuneArguments {
  /** Path to .intunewin file */
  intunewinPath: string;
  /** Application name */
  appName?: string;
  /** Application version */
  appVersion?: string;
  /** Application vendor */
  appVendor?: string;
  /** Application description */
  description?: string;
  /** Path to logo image */
  logoPath?: string;
  /** Skip logo fetching */
  skipLogo?: boolean;
  /** Detection rule JSON from generate_intune_detection */
  detectionRuleJson?: string;
}

/**
 * Result of the publish-to-intune workflow
 */
export interface PublishToIntuneWorkflowResult {
  /** Whether workflow succeeded */
  success: boolean;
  /** Authentication status */
  authConfigured: boolean;
  /** Missing environment variables */
  missingAuthVars?: string[];
  /** Validation passed */
  validationPassed?: boolean;
  /** Validation errors */
  validationErrors?: string[];
  /** Publishing result */
  publishResult?: PublishToIntuneOutput;
  /** Workflow steps completed */
  stepsCompleted: string[];
  /** Next steps for user */
  nextSteps: string[];
}

/**
 * Parse raw arguments into structured arguments
 */
export function parsePublishToIntuneArgs(rawArgs: Record<string, string>): PublishToIntuneArguments {
  return {
    intunewinPath: rawArgs['intunewin-path'] || rawArgs['intunewinPath'] || rawArgs['path'] || '',
    appName: rawArgs['app-name'] || rawArgs['appName'] || rawArgs['name'],
    appVersion: rawArgs['app-version'] || rawArgs['appVersion'] || rawArgs['version'],
    appVendor: rawArgs['app-vendor'] || rawArgs['appVendor'] || rawArgs['vendor'],
    description: rawArgs['description'],
    logoPath: rawArgs['logo-path'] || rawArgs['logoPath'] || rawArgs['logo'],
    skipLogo: rawArgs['skip-logo'] === 'true' || rawArgs['skipLogo'] === 'true',
    detectionRuleJson: rawArgs['detection-rule'] || rawArgs['detectionRule'],
  };
}

/**
 * Execute the publish-to-intune workflow
 */
export async function executePublishToIntuneWorkflow(
  args: PublishToIntuneArguments
): Promise<PublishToIntuneWorkflowResult> {
  logger.info('Starting publish-to-intune workflow', {
    intunewinPath: args.intunewinPath,
    appName: args.appName,
  });

  const stepsCompleted: string[] = [];
  const nextSteps: string[] = [];

  // Step 1: Check authentication configuration
  const authService = getGraphAuthService();
  const authStatus = authService.getConfigStatus();

  if (!authStatus.configured) {
    logger.warn('Authentication not configured', { missing: authStatus.missing });
    return {
      success: false,
      authConfigured: false,
      missingAuthVars: authStatus.missing,
      stepsCompleted: ['Checked authentication configuration'],
      nextSteps: [
        'Set the following environment variables:',
        ...authStatus.missing.map(v => `  - ${v}`),
        '',
        'To create a service principal:',
        '1. Register an app in Azure Entra ID portal',
        '2. Generate a self-signed certificate:',
        '   New-SelfSignedCertificate -Subject "CN=Packager-MCP" -CertStoreLocation "cert:\\CurrentUser\\My" -KeyExportPolicy Exportable -KeySpec Signature -KeyLength 2048 -KeyAlgorithm RSA -HashAlgorithm SHA256',
        '3. Export the certificate and upload public key to app registration',
        '4. Grant "DeviceManagementApps.ReadWrite.All" API permission',
        '5. Grant admin consent',
      ],
    };
  }

  stepsCompleted.push('Verified authentication configuration');

  // Step 2: Validate input file
  const { existsSync } = await import('node:fs');
  const { extname } = await import('node:path');

  if (!args.intunewinPath) {
    return {
      success: false,
      authConfigured: true,
      validationPassed: false,
      validationErrors: ['No .intunewin file path provided'],
      stepsCompleted,
      nextSteps: ['Provide the path to your .intunewin package file'],
    };
  }

  if (!existsSync(args.intunewinPath)) {
    return {
      success: false,
      authConfigured: true,
      validationPassed: false,
      validationErrors: [`File not found: ${args.intunewinPath}`],
      stepsCompleted,
      nextSteps: [
        'Create the .intunewin package using IntuneWinAppUtil.exe:',
        '  IntuneWinAppUtil.exe -c <source_folder> -s <setup_file> -o <output_folder>',
        '',
        'Example:',
        '  IntuneWinAppUtil.exe -c "C:\\Packages\\MyApp" -s "Invoke-AppDeployToolkit.exe" -o "C:\\Packages\\Output"',
      ],
    };
  }

  if (extname(args.intunewinPath).toLowerCase() !== '.intunewin') {
    return {
      success: false,
      authConfigured: true,
      validationPassed: false,
      validationErrors: ['File must have .intunewin extension'],
      stepsCompleted,
      nextSteps: ['Use IntuneWinAppUtil.exe to create an .intunewin package from your PSADT folder'],
    };
  }

  stepsCompleted.push('Validated .intunewin file');

  // Step 3: Validate logo if provided
  if (args.logoPath && !args.skipLogo) {
    if (!existsSync(args.logoPath)) {
      return {
        success: false,
        authConfigured: true,
        validationPassed: false,
        validationErrors: [`Logo file not found: ${args.logoPath}`],
        stepsCompleted,
        nextSteps: [
          'Provide a valid path to a PNG or JPEG logo image',
          'Recommended size: 256x256 pixels',
          'Or use skip-logo=true to skip logo upload',
        ],
      };
    }

    const logoExt = extname(args.logoPath).toLowerCase();
    if (!['.png', '.jpg', '.jpeg'].includes(logoExt)) {
      return {
        success: false,
        authConfigured: true,
        validationPassed: false,
        validationErrors: [`Logo must be PNG or JPEG format, got: ${logoExt}`],
        stepsCompleted,
        nextSteps: ['Convert your logo to PNG or JPEG format'],
      };
    }

    stepsCompleted.push('Validated logo file');
  }

  // Step 4: Parse detection rule if provided
  let detectionRule: IntuneDetectionRule | undefined;
  if (args.detectionRuleJson) {
    try {
      detectionRule = JSON.parse(args.detectionRuleJson) as IntuneDetectionRule;
      stepsCompleted.push('Parsed detection rule');
    } catch (e) {
      return {
        success: false,
        authConfigured: true,
        validationPassed: false,
        validationErrors: ['Invalid detection rule JSON'],
        stepsCompleted,
        nextSteps: [
          'Use generate_intune_detection to create a valid detection rule',
          'Pass the intuneJson output as the detection-rule parameter',
        ],
      };
    }
  }

  // Step 5: Test authentication
  stepsCompleted.push('Testing Graph API authentication');
  const authResult = await authService.getAccessToken();
  if (!authResult.success) {
    return {
      success: false,
      authConfigured: true,
      validationPassed: true,
      validationErrors: [authResult.error || 'Authentication failed'],
      stepsCompleted,
      nextSteps: authResult.suggestions || [
        'Verify your certificate is valid and not expired',
        'Check that admin consent was granted for the API permissions',
      ],
    };
  }

  stepsCompleted.push('Authenticated to Microsoft Graph API');

  // Step 6: Publish the app
  const publisherService = getIntunePublisherService();

  const input: PublishToIntuneInput = {
    intunewinPath: args.intunewinPath,
    appName: args.appName,
    appVersion: args.appVersion,
    appVendor: args.appVendor,
    description: args.description,
    logoPath: args.logoPath,
    skipLogo: args.skipLogo,
    detectionRule,
  };

  logger.info('Publishing app to Intune');
  const publishResult = await publisherService.publishApp(input);

  if (publishResult.success) {
    stepsCompleted.push('Created Win32 app in Intune');
    stepsCompleted.push('Uploaded package content');
    if (publishResult.category) {
      stepsCompleted.push(`Assigned category: ${publishResult.category}`);
    }
    if (publishResult.logoUploaded) {
      stepsCompleted.push('Uploaded app logo');
    }

    nextSteps.push(`View app in Intune: ${publishResult.portalUrl}`);
    nextSteps.push('Create app assignments to deploy to devices');
    nextSteps.push('Consider adding requirements rules if needed');
    if (!detectionRule) {
      nextSteps.push('Add detection rules to ensure proper installation detection');
    }
  }

  return {
    success: publishResult.success,
    authConfigured: true,
    validationPassed: true,
    publishResult,
    stepsCompleted,
    nextSteps: publishResult.success ? nextSteps : (publishResult.recommendations || []),
  };
}

/**
 * Format workflow result for display
 */
export function formatPublishToIntuneResult(result: PublishToIntuneWorkflowResult): string {
  const lines: string[] = [];

  lines.push('# Publish to Intune Workflow');
  lines.push('');

  // Status
  if (result.success) {
    lines.push('## Status: SUCCESS');
  } else {
    lines.push('## Status: FAILED');
  }
  lines.push('');

  // Steps completed
  if (result.stepsCompleted.length > 0) {
    lines.push('### Steps Completed');
    result.stepsCompleted.forEach(step => {
      lines.push(`- [x] ${step}`);
    });
    lines.push('');
  }

  // Authentication status
  if (!result.authConfigured) {
    lines.push('### Authentication Not Configured');
    lines.push('');
    lines.push('The following environment variables are missing:');
    result.missingAuthVars?.forEach(v => {
      lines.push(`- \`${v}\``);
    });
    lines.push('');
  }

  // Validation errors
  if (result.validationErrors && result.validationErrors.length > 0) {
    lines.push('### Validation Errors');
    result.validationErrors.forEach(err => {
      lines.push(`- ${err}`);
    });
    lines.push('');
  }

  // Publish result
  if (result.publishResult) {
    const pr = result.publishResult;
    if (pr.success) {
      lines.push('### Published App Details');
      lines.push('');
      lines.push(`- **App ID**: ${pr.appId}`);
      lines.push(`- **App Name**: ${pr.appName}`);
      lines.push(`- **Category**: ${pr.category}`);
      lines.push(`- **Logo Uploaded**: ${pr.logoUploaded ? 'Yes' : 'No'}`);
      lines.push(`- **Portal URL**: ${pr.portalUrl}`);
    } else {
      lines.push('### Publishing Error');
      lines.push('');
      lines.push(pr.error || 'Unknown error occurred');
    }
    lines.push('');

    if (pr.recommendations && pr.recommendations.length > 0) {
      lines.push('### Recommendations');
      pr.recommendations.forEach(rec => {
        lines.push(`- ${rec}`);
      });
      lines.push('');
    }
  }

  // Next steps
  if (result.nextSteps.length > 0) {
    lines.push('### Next Steps');
    result.nextSteps.forEach(step => {
      lines.push(`- ${step}`);
    });
  }

  return lines.join('\n');
}
