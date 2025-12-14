// Type definitions for MCP prompt workflows

import type { InstallerType } from './winget.js';
import type { ValidationLevel, TargetEnvironment, ValidationCategory } from './validation.js';
import type { DetectionType } from './intune.js';
import type { TemplateComplexity } from './psadt.js';

// ============================================
// Common Types
// ============================================

/** Output format options for structured data */
export type OutputFormat = 'json' | 'csv' | 'markdown';

/** Workflow status */
export type WorkflowStatus = 'success' | 'partial' | 'error';

/** Base workflow result */
export interface WorkflowResult {
  status: WorkflowStatus;
  message: string;
  warnings?: string[];
  errors?: string[];
}

// ============================================
// /package-app Prompt Types
// ============================================

/** Arguments for the /package-app prompt */
export interface PackageAppArguments {
  /** Application name or Winget package ID (required) */
  applicationName: string;
  /** Skip validation and detailed guidance */
  quick?: boolean;
  /** Skip the validation step */
  noValidate?: boolean;
  /** Preferred installer architecture */
  architecture?: 'x64' | 'x86' | 'arm64';
  /** Template complexity level */
  complexity?: TemplateComplexity;
  /** Target deployment environment */
  environment?: TargetEnvironment;
  /** Directory to create the complete PSADT package with toolkit files */
  outputDirectory?: string;
}

/** Winget lookup step result */
export interface WingetLookupResult {
  found: boolean;
  packageId?: string;
  packageName?: string;
  publisher?: string;
  version?: string;
  description?: string;
  installerType?: InstallerType;
  installerUrl?: string;
  productCode?: string;
  silentArgs?: string;
  uninstallArgs?: string;
  alternatives?: Array<{
    packageId: string;
    packageName: string;
    version: string;
  }>;
}

/** Detection rule configuration */
export interface DetectionRuleConfig {
  type: DetectionType;
  config: Record<string, unknown>;
  powershellScript: string;
  intuneJson?: Record<string, unknown> | null;
}

/** Generated package structure */
export interface PackageStructure {
  deployScript: string;
  detectionScript: string;
  detectionRule: DetectionRuleConfig;
  packageStructureDoc: string;
  recommendations: string[];
}

/** Full /package-app workflow result */
export interface PackageAppResult extends WorkflowResult {
  /** Winget lookup information */
  lookup: WingetLookupResult;
  /** Generated PSADT script */
  script?: string;
  /** Detection rule configuration */
  detection?: DetectionRuleConfig;
  /** Validation results (if run) */
  validation?: {
    isValid: boolean;
    score: number;
    errorCount: number;
    warningCount: number;
    summary: string;
    issues?: Array<{
      severity: string;
      message: string;
      suggestion?: string;
    }>;
  };
  /** Complete package structure */
  package?: PackageStructure;
  /** Next steps for the user */
  nextSteps: string[];
  /** Package creation info (when output_directory was specified) */
  packageCreation?: {
    outputDirectory: string;
    scriptPath: string;
    copiedFiles: string[];
  };
}

// ============================================
// /troubleshoot Prompt Types
// ============================================

/** Arguments for the /troubleshoot prompt */
export interface TroubleshootArguments {
  /** Path to log file for analysis */
  logFile?: string;
  /** Specific error code to investigate */
  errorCode?: number;
  /** Error message to analyze */
  errorMessage?: string;
  /** Installer type if known */
  installerType?: InstallerType;
  /** Description of the issue */
  issueDescription?: string;
}

/** Identified cause */
export interface IdentifiedCause {
  /** Likelihood (high, medium, low) */
  likelihood: 'high' | 'medium' | 'low';
  /** Description of the cause */
  description: string;
  /** Evidence supporting this cause */
  evidence: string[];
  /** Reference to documentation or KB */
  reference?: string;
}

/** Suggested fix */
export interface SuggestedFix {
  /** Priority (1 = highest) */
  priority: number;
  /** Description of the fix */
  description: string;
  /** Detailed steps */
  steps: string[];
  /** Code snippet if applicable */
  codeSnippet?: string;
  /** Expected outcome */
  expectedOutcome: string;
}

/** Log analysis result */
export interface LogAnalysis {
  /** Log file processed */
  logFile?: string;
  /** Key error entries found */
  errorEntries: Array<{
    lineNumber: number;
    content: string;
    severity: 'error' | 'warning' | 'info';
  }>;
  /** Identified patterns */
  patterns: string[];
  /** Summary of log analysis */
  summary: string;
}

/** Exit code information */
export interface ExitCodeInfo {
  code: number;
  name: string;
  description: string;
  installerType: string;
  resolution?: string;
}

/** /troubleshoot workflow result */
export interface TroubleshootResult extends WorkflowResult {
  /** Error code details if provided */
  exitCodeInfo?: ExitCodeInfo;
  /** Log analysis if log file provided */
  logAnalysis?: LogAnalysis;
  /** Identified causes */
  causes: IdentifiedCause[];
  /** Suggested fixes */
  fixes: SuggestedFix[];
  /** Additional resources */
  resources: Array<{
    title: string;
    uri: string;
    description: string;
  }>;
}

// ============================================
// /bulk-lookup Prompt Types
// ============================================

/** Arguments for the /bulk-lookup prompt */
export interface BulkLookupArguments {
  /** Comma-separated list of applications */
  applications: string;
  /** Output format */
  output?: OutputFormat;
  /** Include version history */
  includeVersions?: boolean;
  /** Include installer details */
  includeInstallers?: boolean;
}

/** Single application lookup result */
export interface ApplicationLookup {
  /** Original query */
  query: string;
  /** Whether found in Winget */
  found: boolean;
  /** Error message if lookup failed */
  error?: string;
  /** Package details if found */
  package?: {
    packageId: string;
    packageName: string;
    publisher: string;
    version: string;
    description?: string;
    installerType?: InstallerType;
    installerUrl?: string;
    productCode?: string;
    silentArgs?: string;
    tags?: string[];
  };
}

/** /bulk-lookup workflow result */
export interface BulkLookupResult extends WorkflowResult {
  /** Total applications requested */
  totalRequested: number;
  /** Successfully found */
  foundCount: number;
  /** Not found */
  notFoundCount: number;
  /** Individual results */
  results: ApplicationLookup[];
  /** Formatted output */
  formattedOutput: string;
  /** Output format used */
  outputFormat: OutputFormat;
}

// ============================================
// Prompt Registration Types
// ============================================

/** MCP Prompt metadata */
export interface PromptMetadata {
  name: string;
  description: string;
  arguments: PromptArgumentDefinition[];
}

/** Prompt argument definition for MCP */
export interface PromptArgumentDefinition {
  name: string;
  description: string;
  required: boolean;
}

/** Complete prompt response for MCP */
export interface PromptResponse {
  description?: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: {
      type: 'text';
      text: string;
    };
  }>;
}

// Convert Legacy Workflow Types

/** Arguments for the convert-legacy prompt workflow */
export interface ConvertLegacyArguments {
  scriptPathOrContent: string;
  outputPath?: string;
  preserveComments?: boolean;
  isFilePath?: boolean;
  verbose?: boolean;
}

/** Function mapping from v3 to v4 */
export interface FunctionMapping {
  v3Function: string;
  v4Function: string;
  parameterChanges?: string;
  notes?: string;
  lineNumbers: number[];
}

/** Variable mapping from v3 to v4 */
export interface VariableMapping {
  v3Variable: string;
  v4Variable: string;
  notes?: string;
  lineNumbers: number[];
}

/** Points requiring manual review */
export interface ManualReviewPoint {
  lineNumber: number;
  context?: string;
  reason?: string;
  suggestion?: string;
  category?: string;
  description?: string;
  originalCode?: string;
}

/** Checklist item for migration */
export interface ChecklistItem {
  item: string;
  completed: boolean;
  notes?: string;
}

/** Validation result */
export interface ConvertValidation {
  isValid: boolean;
  score: number;
  issues: Array<{ severity: string; message: string }>;
}

/** Analysis result for script conversion */
export interface ScriptAnalysis {
  detectedVersion: 'v3' | 'v4' | 'unknown';
  functionMappings: FunctionMapping[];
  variableMappings: VariableMapping[];
  manualReviewPoints?: ManualReviewPoint[];
  structureIssues: string[];
  originalLineCount?: number;
  convertedLineCount?: number;
}

/** Result of the convert-legacy workflow */
export interface ConvertLegacyResult extends WorkflowResult {
  analysis: ScriptAnalysis;
  convertedScript?: string;
  warnings: string[];
  manualReviewPoints: ManualReviewPoint[];
  checklist: ChecklistItem[];
  validation?: ConvertValidation;
}
