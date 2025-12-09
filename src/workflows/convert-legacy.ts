// Convert Legacy Workflow - Convert PSADT v3 scripts to v4 format

import { getLogger } from '../utils/logger.js';
import { getValidationService } from '../services/validation.js';
import type {
  ConvertLegacyArguments,
  ConvertLegacyResult,
  FunctionMapping,
  VariableMapping,
  ManualReviewPoint,
} from '../types/prompts.js';

const logger = getLogger().child({ workflow: 'convert-legacy' });

// V3 to V4 function mappings
const FUNCTION_MAPPINGS: Array<{
  v3Pattern: RegExp;
  v3Name: string;
  v4Name: string;
  parameterChanges?: string;
  notes?: string;
}> = [
  // Core functions
  { v3Pattern: /\bExecute-Process\b/gi, v3Name: 'Execute-Process', v4Name: 'Start-ADTProcess', parameterChanges: '-Path → -FilePath, -Parameters → -Arguments' },
  { v3Pattern: /\bExecute-ProcessAsUser\b/gi, v3Name: 'Execute-ProcessAsUser', v4Name: 'Start-ADTProcessAsUser' },
  { v3Pattern: /\bExecute-MSI\b/gi, v3Name: 'Execute-MSI', v4Name: 'Start-ADTMsiProcess' },
  { v3Pattern: /\bShow-InstallationWelcome\b/gi, v3Name: 'Show-InstallationWelcome', v4Name: 'Show-ADTInstallationWelcome' },
  { v3Pattern: /\bShow-InstallationProgress\b/gi, v3Name: 'Show-InstallationProgress', v4Name: 'Show-ADTInstallationProgress' },
  { v3Pattern: /\bClose-InstallationProgress\b/gi, v3Name: 'Close-InstallationProgress', v4Name: 'Close-ADTInstallationProgress' },
  { v3Pattern: /\bShow-InstallationPrompt\b/gi, v3Name: 'Show-InstallationPrompt', v4Name: 'Show-ADTInstallationPrompt' },
  { v3Pattern: /\bShow-InstallationRestartPrompt\b/gi, v3Name: 'Show-InstallationRestartPrompt', v4Name: 'Show-ADTInstallationRestartPrompt' },
  { v3Pattern: /\bShow-BalloonTip\b/gi, v3Name: 'Show-BalloonTip', v4Name: 'Show-ADTBalloonTip' },
  { v3Pattern: /\bExit-Script\b/gi, v3Name: 'Exit-Script', v4Name: 'Complete-ADTDeployment', notes: 'Exit handling is now structured through Complete-ADTDeployment' },

  // File operations
  { v3Pattern: /\bCopy-File\b/gi, v3Name: 'Copy-File', v4Name: 'Copy-ADTFile' },
  { v3Pattern: /\bRemove-File\b/gi, v3Name: 'Remove-File', v4Name: 'Remove-ADTFile' },
  { v3Pattern: /\bNew-Folder\b/gi, v3Name: 'New-Folder', v4Name: 'New-ADTFolder' },
  { v3Pattern: /\bRemove-Folder\b/gi, v3Name: 'Remove-Folder', v4Name: 'Remove-ADTFolder' },
  { v3Pattern: /\bGet-FileVersion\b/gi, v3Name: 'Get-FileVersion', v4Name: 'Get-ADTFileVersion' },

  // Registry operations
  { v3Pattern: /\bSet-RegistryKey\b/gi, v3Name: 'Set-RegistryKey', v4Name: 'Set-ADTRegistryKey' },
  { v3Pattern: /\bRemove-RegistryKey\b/gi, v3Name: 'Remove-RegistryKey', v4Name: 'Remove-ADTRegistryKey' },
  { v3Pattern: /\bGet-RegistryKey\b/gi, v3Name: 'Get-RegistryKey', v4Name: 'Get-ADTRegistryKey' },

  // Shortcut operations
  { v3Pattern: /\bNew-Shortcut\b/gi, v3Name: 'New-Shortcut', v4Name: 'New-ADTShortcut' },
  { v3Pattern: /\bRemove-Shortcut\b/gi, v3Name: 'Remove-Shortcut', v4Name: 'Remove-ADTShortcut' },

  // Application management
  { v3Pattern: /\bGet-InstalledApplication\b/gi, v3Name: 'Get-InstalledApplication', v4Name: 'Get-ADTInstalledApplication' },
  { v3Pattern: /\bRemove-MSIApplications\b/gi, v3Name: 'Remove-MSIApplications', v4Name: 'Remove-ADTInstalledApplication' },
  { v3Pattern: /\bGet-RunningProcesses\b/gi, v3Name: 'Get-RunningProcesses', v4Name: 'Get-ADTRunningProcesses' },
  { v3Pattern: /\bBlock-AppExecution\b/gi, v3Name: 'Block-AppExecution', v4Name: 'Block-ADTAppExecution' },
  { v3Pattern: /\bUnblock-AppExecution\b/gi, v3Name: 'Unblock-AppExecution', v4Name: 'Unblock-ADTAppExecution' },

  // Logging
  { v3Pattern: /\bWrite-Log\b/gi, v3Name: 'Write-Log', v4Name: 'Write-ADTLogEntry' },

  // Utility functions
  { v3Pattern: /\bTest-Battery\b/gi, v3Name: 'Test-Battery', v4Name: 'Test-ADTBattery' },
  { v3Pattern: /\bTest-NetworkConnection\b/gi, v3Name: 'Test-NetworkConnection', v4Name: 'Test-ADTNetworkConnection' },
  { v3Pattern: /\bTest-PowerPoint\b/gi, v3Name: 'Test-PowerPoint', v4Name: 'Test-ADTPowerPoint' },
  { v3Pattern: /\bGet-DiskSpace\b/gi, v3Name: 'Get-DiskSpace', v4Name: 'Get-ADTDiskSpace' },
  { v3Pattern: /\bGet-FreeDiskSpace\b/gi, v3Name: 'Get-FreeDiskSpace', v4Name: 'Get-ADTDiskSpace' },
  { v3Pattern: /\bConvert-RegistryPath\b/gi, v3Name: 'Convert-RegistryPath', v4Name: 'Convert-ADTRegistryPath' },
];

// V3 to V4 variable mappings
const VARIABLE_MAPPINGS: Array<{
  v3Pattern: RegExp;
  v3Name: string;
  v4Name: string;
}> = [
  { v3Pattern: /\$appVendor\b/gi, v3Name: '$appVendor', v4Name: '$ADTSession.Publisher' },
  { v3Pattern: /\$appName\b/gi, v3Name: '$appName', v4Name: '$ADTSession.InstallName' },
  { v3Pattern: /\$appVersion\b/gi, v3Name: '$appVersion', v4Name: '$ADTSession.InstallVersion' },
  { v3Pattern: /\$deploymentType\b/gi, v3Name: '$deploymentType', v4Name: '$ADTSession.DeploymentType' },
  { v3Pattern: /\$deployMode\b/gi, v3Name: '$deployMode', v4Name: '$ADTSession.DeployMode' },
  { v3Pattern: /\$dirFiles\b/gi, v3Name: '$dirFiles', v4Name: '$ADTSession.FilesDirectory' },
  { v3Pattern: /\$dirSupportFiles\b/gi, v3Name: '$dirSupportFiles', v4Name: '$ADTSession.SupportFilesDirectory' },
  { v3Pattern: /\$scriptDirectory\b/gi, v3Name: '$scriptDirectory', v4Name: '$ADTSession.ScriptDirectory' },
  { v3Pattern: /\$logName\b/gi, v3Name: '$logName', v4Name: '$ADTSession.LogName' },
];

/**
 * Parse raw arguments into structured arguments
 */
export function parseConvertLegacyArgs(rawArgs: Record<string, string>): ConvertLegacyArguments {
  return {
    scriptPathOrContent: rawArgs['script'] || rawArgs['path'] || rawArgs['content'] || '',
    isFilePath: rawArgs['isFilePath'] === 'true' || false,
    verbose: rawArgs['verbose'] === 'true' || false,
  };
}

/**
 * Detect if a script is v3 or v4
 */
function detectVersion(script: string): 'v3' | 'v4' | 'unknown' {
  // V4 indicators
  const v4Indicators = [
    /Import-Module.*PSAppDeployToolkit/i,
    /Initialize-ADTDeployment/i,
    /Complete-ADTDeployment/i,
    /\$ADTSession\./i,
    /-ADT[A-Z]/i, // ADT-prefixed functions
  ];

  // V3 indicators
  const v3Indicators = [
    /\$appVendor\s*=/,
    /\$appName\s*=/,
    /Execute-Process\b/i,
    /Execute-MSI\b/i,
    /Show-InstallationWelcome\b(?!.*-ADT)/i,
    /Exit-Script\b/i,
  ];

  let v4Score = 0;
  let v3Score = 0;

  for (const pattern of v4Indicators) {
    if (pattern.test(script)) v4Score++;
  }

  for (const pattern of v3Indicators) {
    if (pattern.test(script)) v3Score++;
  }

  if (v4Score >= 2 && v4Score > v3Score) return 'v4';
  if (v3Score >= 2 && v3Score > v4Score) return 'v3';
  if (v3Score > 0) return 'v3';
  return 'unknown';
}

/**
 * Find all occurrences of legacy functions in script
 */
function findFunctionMappings(script: string): FunctionMapping[] {
  const mappings: FunctionMapping[] = [];
  const lines = script.split('\n');

  for (const mapping of FUNCTION_MAPPINGS) {
    const lineNumbers: number[] = [];

    lines.forEach((line, index) => {
      if (mapping.v3Pattern.test(line)) {
        lineNumbers.push(index + 1);
      }
      mapping.v3Pattern.lastIndex = 0; // Reset regex
    });

    if (lineNumbers.length > 0) {
      mappings.push({
        v3Function: mapping.v3Name,
        v4Function: mapping.v4Name,
        lineNumbers,
        parameterChanges: mapping.parameterChanges,
        notes: mapping.notes,
      });
    }
  }

  return mappings;
}

/**
 * Find all occurrences of legacy variables in script
 */
function findVariableMappings(script: string): VariableMapping[] {
  const mappings: VariableMapping[] = [];
  const lines = script.split('\n');

  for (const mapping of VARIABLE_MAPPINGS) {
    const lineNumbers: number[] = [];

    lines.forEach((line, index) => {
      if (mapping.v3Pattern.test(line)) {
        lineNumbers.push(index + 1);
      }
      mapping.v3Pattern.lastIndex = 0; // Reset regex
    });

    if (lineNumbers.length > 0) {
      mappings.push({
        v3Variable: mapping.v3Name,
        v4Variable: mapping.v4Name,
        lineNumbers,
      });
    }
  }

  return mappings;
}

/**
 * Identify structure issues in v3 script
 */
function findStructureIssues(script: string): string[] {
  const issues: string[] = [];

  // Check for missing module import
  if (!/Import-Module.*PSAppDeployToolkit/i.test(script)) {
    issues.push('Missing Import-Module PSAppDeployToolkit statement');
  }

  // Check for missing initialization
  if (!/Initialize-ADTDeployment/i.test(script)) {
    issues.push('Missing Initialize-ADTDeployment call');
  }

  // Check for proper completion
  if (!/Complete-ADTDeployment/i.test(script)) {
    issues.push('Missing Complete-ADTDeployment call');
  }

  // Check for param block
  if (!/^\s*param\s*\(/mi.test(script)) {
    issues.push('Missing param() block - v4 uses CmdletBinding parameter block');
  }

  // Check for try/catch
  if (!/\btry\s*\{/i.test(script) || !/\bcatch\s*\{/i.test(script)) {
    issues.push('Missing try/catch block for structured error handling');
  }

  return issues;
}

/**
 * Convert a v3 script to v4 format
 */
function convertScript(script: string, functionMappings: FunctionMapping[], variableMappings: VariableMapping[]): string {
  let converted = script;

  // Replace function calls
  for (const mapping of functionMappings) {
    const pattern = new RegExp(`\\b${escapeRegex(mapping.v3Function)}\\b`, 'gi');
    converted = converted.replace(pattern, mapping.v4Function);
  }

  // Replace variable references (but not declarations)
  for (const mapping of variableMappings) {
    // Only replace variable uses, not declarations
    const usePattern = new RegExp(`(?<!\\$)${escapeRegex(mapping.v3Variable)}(?!\\s*=)`, 'gi');
    converted = converted.replace(usePattern, mapping.v4Variable);
  }

  // Add v4 structure if missing
  const hasModuleImport = /Import-Module.*PSAppDeployToolkit/i.test(converted);
  const hasInitialize = /Initialize-ADTDeployment/i.test(converted);
  const hasComplete = /Complete-ADTDeployment/i.test(converted);
  const hasParamBlock = /^\s*param\s*\(/mi.test(converted);

  // If script is missing key v4 elements, add a header comment
  if (!hasModuleImport || !hasInitialize || !hasComplete || !hasParamBlock) {
    const header = generateV4Header();
    converted = header + '\n\n# --- BEGIN CONVERTED SCRIPT ---\n' + converted + '\n# --- END CONVERTED SCRIPT ---\n\n' + generateV4Footer();
  }

  // Replace -Path with -FilePath for Start-ADTProcess
  converted = converted.replace(/Start-ADTProcess\s+-Path\b/gi, 'Start-ADTProcess -FilePath');

  // Replace -Parameters with -Arguments
  converted = converted.replace(/(-FilePath\s+[^\s]+)\s+-Parameters\b/gi, '$1 -Arguments');

  return converted;
}

/**
 * Generate v4 script header template
 */
function generateV4Header(): string {
  return `#Requires -Version 5.1

<#
.SYNOPSIS
    PSADT v4 Deployment Script (Converted from v3)

.DESCRIPTION
    This script was converted from PSADT v3 format.
    Review all MANUAL_REVIEW markers for items requiring attention.

.NOTES
    Converted by Intune Packaging Assistant MCP Server
#>

[CmdletBinding()]
param (
    [ValidateSet('Install', 'Uninstall', 'Repair')]
    [string]$DeploymentType = 'Install',
    [ValidateSet('Interactive', 'Silent', 'NonInteractive')]
    [string]$DeployMode = 'Interactive',
    [switch]$AllowRebootPassThru,
    [switch]$TerminalServerMode,
    [switch]$DisableLogging
)

# Import PSADT module
Import-Module "$PSScriptRoot\\PSAppDeployToolkit" -Force

# MANUAL_REVIEW: Update these values from your original script
Initialize-ADTDeployment @{
    InstallName = 'Application Name'
    InstallVersion = '1.0.0'
    Publisher = 'Publisher'
    DeploymentType = $DeploymentType
    DeployMode = $DeployMode
    AllowRebootPassThru = $AllowRebootPassThru
    TerminalServerMode = $TerminalServerMode
    DisableLogging = $DisableLogging
}

try {
    switch ($DeploymentType) {
        'Install' {`;
}

/**
 * Generate v4 script footer template
 */
function generateV4Footer(): string {
  return `        }
        'Uninstall' {
            # MANUAL_REVIEW: Add uninstall logic
        }
        'Repair' {
            # MANUAL_REVIEW: Add repair logic (optional)
        }
    }

    Complete-ADTDeployment -DeploymentStatus 'Complete'
}
catch {
    Complete-ADTDeployment -DeploymentStatus 'Failed' -ErrorMessage $_.Exception.Message
}`;
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Identify manual review points in converted script
 */
function identifyManualReviewPoints(
  originalScript: string,
  convertedScript: string,
  functionMappings: FunctionMapping[],
  variableMappings: VariableMapping[]
): ManualReviewPoint[] {
  const points: ManualReviewPoint[] = [];
  const lines = convertedScript.split('\n');

  // Find MANUAL_REVIEW markers
  lines.forEach((line, index) => {
    if (line.includes('MANUAL_REVIEW')) {
      points.push({
        lineNumber: index + 1,
        category: 'structure',
        description: 'Review and update this section with your specific values',
        originalCode: line.trim(),
      });
    }
  });

  // Flag functions with parameter changes
  for (const mapping of functionMappings) {
    if (mapping.parameterChanges) {
      mapping.lineNumbers.forEach(lineNum => {
        const originalLine = originalScript.split('\n')[lineNum - 1];
        if (originalLine) {
          points.push({
            lineNumber: lineNum,
            category: 'function',
            description: `Function ${mapping.v3Function} → ${mapping.v4Function}: ${mapping.parameterChanges}`,
            originalCode: originalLine.trim(),
          });
        }
      });
    }
  }

  // Flag variable declarations that need updating
  const varDeclPattern = /^\s*\[(string|int|bool)\]\s*\$app(Vendor|Name|Version)/i;
  lines.forEach((line, index) => {
    if (varDeclPattern.test(line)) {
      points.push({
        lineNumber: index + 1,
        category: 'variable',
        description: 'Variable declaration should be moved to Initialize-ADTDeployment parameters',
        originalCode: line.trim(),
      });
    }
  });

  // Sort by line number
  points.sort((a, b) => a.lineNumber - b.lineNumber);

  return points;
}

/**
 * Generate migration checklist
 */
function generateChecklist(
  functionMappings: FunctionMapping[],
  variableMappings: VariableMapping[],
  structureIssues: string[]
): Array<{ item: string; completed: boolean; notes?: string }> {
  const checklist: Array<{ item: string; completed: boolean; notes?: string }> = [];

  // Structure items
  checklist.push({
    item: 'Add CmdletBinding param block',
    completed: structureIssues.every(i => !i.includes('param()')),
  });

  checklist.push({
    item: 'Add Import-Module PSAppDeployToolkit',
    completed: structureIssues.every(i => !i.includes('Import-Module')),
  });

  checklist.push({
    item: 'Add Initialize-ADTDeployment call',
    completed: structureIssues.every(i => !i.includes('Initialize-ADTDeployment')),
  });

  checklist.push({
    item: 'Add Complete-ADTDeployment call',
    completed: structureIssues.every(i => !i.includes('Complete-ADTDeployment')),
  });

  checklist.push({
    item: 'Add try/catch error handling',
    completed: structureIssues.every(i => !i.includes('try/catch')),
  });

  // Function migrations
  if (functionMappings.length > 0) {
    checklist.push({
      item: `Update ${functionMappings.length} function call(s) to v4 ADT-prefixed versions`,
      completed: true, // Automated
      notes: functionMappings.map(m => `${m.v3Function} → ${m.v4Function}`).join(', '),
    });
  }

  // Variable migrations
  if (variableMappings.length > 0) {
    checklist.push({
      item: `Update ${variableMappings.length} variable reference(s) to use $ADTSession`,
      completed: true, // Automated
      notes: variableMappings.map(m => `${m.v3Variable} → ${m.v4Variable}`).join(', '),
    });
  }

  // Testing items
  checklist.push({
    item: 'Test in Interactive mode',
    completed: false,
  });

  checklist.push({
    item: 'Test in Silent mode',
    completed: false,
  });

  checklist.push({
    item: 'Verify logging works correctly',
    completed: false,
  });

  checklist.push({
    item: 'Test uninstall if implemented',
    completed: false,
  });

  return checklist;
}

/**
 * Execute the convert-legacy workflow
 */
export async function executeConvertLegacyWorkflow(
  args: ConvertLegacyArguments
): Promise<ConvertLegacyResult> {
  logger.info('Starting convert-legacy workflow', { args });

  const result: ConvertLegacyResult = {
    status: 'error',
    message: '',
    analysis: {
      detectedVersion: 'unknown',
      functionMappings: [],
      variableMappings: [],
      structureIssues: [],
    },
    manualReviewPoints: [],
    checklist: [],
  };

  // Get script content
  const script = args.scriptPathOrContent;
  if (!script || script.trim().length === 0) {
    result.message = 'No script content provided';
    result.errors = ['Script path or content is required'];
    return result;
  }

  // Detect version
  result.analysis.detectedVersion = detectVersion(script);

  if (result.analysis.detectedVersion === 'v4') {
    result.status = 'partial';
    result.message = 'Script appears to already be in PSADT v4 format';
    result.warnings = ['The provided script already contains v4 indicators. No conversion needed.'];
    result.checklist = generateChecklist([], [], []);
    return result;
  }

  if (result.analysis.detectedVersion === 'unknown') {
    result.warnings = ['Could not definitively determine script version. Proceeding with v3 to v4 conversion.'];
  }

  // Analyze script
  result.analysis.functionMappings = findFunctionMappings(script);
  result.analysis.variableMappings = findVariableMappings(script);
  result.analysis.structureIssues = findStructureIssues(script);

  // Convert script
  result.convertedScript = convertScript(
    script,
    result.analysis.functionMappings,
    result.analysis.variableMappings
  );

  // Identify manual review points
  result.manualReviewPoints = identifyManualReviewPoints(
    script,
    result.convertedScript,
    result.analysis.functionMappings,
    result.analysis.variableMappings
  );

  // Validate converted script
  const validationService = getValidationService();
  try {
    const validationResult = await validationService.validatePackage({
      script: result.convertedScript,
      level: 'standard',
      environment: 'intune',
    });

    result.validation = {
      isValid: validationResult.result.isValid,
      score: validationResult.result.score,
      issues: validationResult.result.issues.map(i => ({
        severity: i.severity,
        message: i.message,
      })),
    };
  } catch (error) {
    logger.warn('Validation of converted script failed', { error });
  }

  // Generate checklist
  result.checklist = generateChecklist(
    result.analysis.functionMappings,
    result.analysis.variableMappings,
    result.analysis.structureIssues
  );

  // Set status
  const hasErrors = result.manualReviewPoints.length > 5;
  if (hasErrors) {
    result.status = 'partial';
    result.message = `Script converted with ${result.manualReviewPoints.length} items requiring manual review`;
  } else {
    result.status = 'success';
    result.message = 'Script successfully converted to PSADT v4 format';
  }

  logger.info('Convert-legacy workflow completed', { status: result.status });
  return result;
}

/**
 * Format workflow result as user-friendly text
 */
export function formatConvertLegacyResult(result: ConvertLegacyResult): string {
  const lines: string[] = [];

  // Header
  lines.push(`## PSADT Script Conversion ${result.status === 'success' ? 'Complete' : result.status === 'partial' ? 'Completed with Notes' : 'Failed'}`);
  lines.push('');
  lines.push(result.message);
  lines.push('');

  // Analysis
  lines.push('### Analysis');
  lines.push(`- **Detected Version**: ${result.analysis.detectedVersion}`);
  lines.push(`- **Functions to Update**: ${result.analysis.functionMappings.length}`);
  lines.push(`- **Variables to Update**: ${result.analysis.variableMappings.length}`);
  lines.push(`- **Structure Issues**: ${result.analysis.structureIssues.length}`);
  lines.push('');

  // Function mappings
  if (result.analysis.functionMappings.length > 0) {
    lines.push('### Function Migrations');
    result.analysis.functionMappings.forEach(m => {
      lines.push(`- \`${m.v3Function}\` → \`${m.v4Function}\` (lines: ${m.lineNumbers.join(', ')})`);
      if (m.parameterChanges) {
        lines.push(`  - Parameter changes: ${m.parameterChanges}`);
      }
    });
    lines.push('');
  }

  // Variable mappings
  if (result.analysis.variableMappings.length > 0) {
    lines.push('### Variable Migrations');
    result.analysis.variableMappings.forEach(m => {
      lines.push(`- \`${m.v3Variable}\` → \`${m.v4Variable}\` (lines: ${m.lineNumbers.join(', ')})`);
    });
    lines.push('');
  }

  // Manual review points
  if (result.manualReviewPoints.length > 0) {
    lines.push('### Manual Review Required');
    result.manualReviewPoints.slice(0, 10).forEach(p => {
      lines.push(`- **Line ${p.lineNumber}** [${p.category}]: ${p.description}`);
    });
    if (result.manualReviewPoints.length > 10) {
      lines.push(`- ... and ${result.manualReviewPoints.length - 10} more items`);
    }
    lines.push('');
  }

  // Validation
  if (result.validation) {
    lines.push('### Validation Results');
    lines.push(`- **Status**: ${result.validation.isValid ? 'Passed' : 'Issues Found'}`);
    lines.push(`- **Score**: ${result.validation.score}/100`);
    if (result.validation.issues.length > 0) {
      lines.push('');
      lines.push('**Top Issues:**');
      result.validation.issues.slice(0, 5).forEach(i => {
        lines.push(`- [${i.severity.toUpperCase()}] ${i.message}`);
      });
    }
    lines.push('');
  }

  // Checklist
  if (result.checklist.length > 0) {
    lines.push('### Migration Checklist');
    result.checklist.forEach(item => {
      const check = item.completed ? '✓' : '○';
      lines.push(`- [${check}] ${item.item}`);
      if (item.notes) {
        lines.push(`  - ${item.notes}`);
      }
    });
    lines.push('');
  }

  // Warnings
  if (result.warnings && result.warnings.length > 0) {
    lines.push('### Warnings');
    result.warnings.forEach(w => lines.push(`- ${w}`));
    lines.push('');
  }

  lines.push('*The converted script is included below for your review.*');

  return lines.join('\n');
}
