import type { InstallerType } from './winget.js';
import type { TargetEnvironment } from './validation.js';
import type { DetectionType } from './intune.js';
import type { TemplateComplexity } from './psadt.js';
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
}
/** Arguments for the /convert-legacy prompt */
export interface ConvertLegacyArguments {
    /** Path to the v3 script or the script content itself */
    scriptPathOrContent: string;
    /** Whether the input is a file path or script content */
    isFilePath?: boolean;
    /** Whether to include detailed migration notes */
    verbose?: boolean;
}
/** Deprecated function mapping */
export interface FunctionMapping {
    /** Original v3 function name */
    v3Function: string;
    /** Corresponding v4 function name */
    v4Function: string;
    /** Line numbers where found */
    lineNumbers: number[];
    /** Any parameter changes */
    parameterChanges?: string;
    /** Notes about the migration */
    notes?: string;
}
/** Variable migration */
export interface VariableMapping {
    /** Original v3 variable */
    v3Variable: string;
    /** Corresponding v4 equivalent */
    v4Variable: string;
    /** Line numbers where found */
    lineNumbers: number[];
}
/** Manual review point */
export interface ManualReviewPoint {
    /** Line number in converted script */
    lineNumber: number;
    /** Category of review needed */
    category: 'function' | 'variable' | 'structure' | 'custom-logic';
    /** Description of what needs review */
    description: string;
    /** Original code snippet */
    originalCode: string;
    /** Suggested replacement */
    suggestedCode?: string;
}
/** /convert-legacy workflow result */
export interface ConvertLegacyResult extends WorkflowResult {
    /** Original script analysis */
    analysis: {
        detectedVersion: 'v3' | 'v4' | 'unknown';
        functionMappings: FunctionMapping[];
        variableMappings: VariableMapping[];
        structureIssues: string[];
    };
    /** Converted script (v4 format) */
    convertedScript?: string;
    /** Points requiring manual review */
    manualReviewPoints: ManualReviewPoint[];
    /** Validation result of converted script */
    validation?: {
        isValid: boolean;
        score: number;
        issues: Array<{
            severity: string;
            message: string;
        }>;
    };
    /** Migration checklist */
    checklist: Array<{
        item: string;
        completed: boolean;
        notes?: string;
    }>;
}
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
//# sourceMappingURL=prompts.d.ts.map