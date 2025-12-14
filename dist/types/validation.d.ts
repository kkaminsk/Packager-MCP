/**
 * Severity levels for validation issues
 */
export type ValidationSeverity = 'error' | 'warning' | 'info';
/**
 * Categories of validation rules
 */
export type ValidationCategory = 'structure' | 'psadt' | 'intune' | 'security' | 'best-practice';
/**
 * Validation levels controlling which rules are applied
 * - basic: Critical errors only (missing functions, syntax)
 * - standard: Basic + warnings (best practices, potential issues)
 * - strict: Standard + info (style, optimization suggestions)
 */
export type ValidationLevel = 'basic' | 'standard' | 'strict';
/**
 * Target deployment environment
 */
export type TargetEnvironment = 'intune' | 'sccm' | 'standalone';
/**
 * A single validation rule definition
 */
export interface ValidationRule {
    /** Unique rule identifier */
    id: string;
    /** Human-readable rule name */
    name: string;
    /** Description of what this rule checks */
    description: string;
    /** Severity level of violations */
    severity: ValidationSeverity;
    /** Category this rule belongs to */
    category: ValidationCategory;
    /** Minimum validation level where this rule applies */
    minLevel: ValidationLevel;
    /** Target environments where this rule applies (empty = all) */
    environments?: TargetEnvironment[];
    /** Suggestion for how to fix violations */
    suggestion: string;
    /**
     * Check function - returns matches found in the script
     * Each match includes line number and optional context
     */
    check: (script: string, lines: string[]) => ValidationMatch[];
}
/**
 * A match found by a validation rule
 */
export interface ValidationMatch {
    /** Line number where the issue was found (1-indexed) */
    lineNumber?: number;
    /** The actual line content that matched */
    lineContent?: string;
    /** Additional context for the match */
    context?: string;
}
/**
 * A validation issue found in a script
 */
export interface ValidationIssue {
    /** Rule ID that triggered this issue */
    ruleId: string;
    /** Rule name */
    ruleName: string;
    /** Severity of the issue */
    severity: ValidationSeverity;
    /** Category of the issue */
    category: ValidationCategory;
    /** Description of the issue */
    message: string;
    /** Line number where the issue was found (1-indexed, if applicable) */
    lineNumber?: number;
    /** The line content where the issue was found */
    lineContent?: string;
    /** Suggestion for how to fix the issue */
    suggestion: string;
}
/**
 * A validation check that passed
 */
export interface PassedCheck {
    /** Rule ID */
    ruleId: string;
    /** Rule name */
    ruleName: string;
    /** Category */
    category: ValidationCategory;
    /** Description of what was checked */
    description: string;
}
/**
 * Overall validation result
 */
export interface ValidationResult {
    /** Whether the validation passed (no errors) */
    isValid: boolean;
    /** Validation score from 0-100 */
    score: number;
    /** Total issues found */
    totalIssues: number;
    /** Count by severity */
    errorCount: number;
    warningCount: number;
    infoCount: number;
    /** Detailed issues */
    issues: ValidationIssue[];
    /** Rules that passed */
    passedChecks: PassedCheck[];
    /** Summary message */
    summary: string;
    /** Validation level used */
    level: ValidationLevel;
    /** Target environment used */
    environment: TargetEnvironment;
    /** Categories that were checked */
    categoriesChecked: ValidationCategory[];
}
/**
 * Input for the validate_package tool
 */
export interface ValidatePackageInput {
    /** PowerShell script content to validate */
    script: string;
    /** Validation level (default: 'standard') */
    level?: ValidationLevel;
    /** Target deployment environment (default: 'intune') */
    environment?: TargetEnvironment;
    /** Specific categories to check (default: all) */
    categories?: ValidationCategory[];
}
/**
 * Output from the validate_package tool
 */
export interface ValidatePackageOutput {
    /** Success indicator */
    success: boolean;
    /** Validation results */
    result: ValidationResult;
}
/**
 * Input for the verify_psadt_functions tool
 */
export interface VerifyPsadtFunctionsInput {
    /** Path to the PSADT script file to verify */
    filePath: string;
}
/**
 * An invalid function found in a script
 */
export interface InvalidFunctionEntry {
    /** The incorrect function name found */
    functionName: string;
    /** Line number where the function was found (1-indexed) */
    lineNumber: number;
    /** The line content containing the function */
    lineContent: string;
    /** Suggested replacement function (if known) */
    suggestedReplacement?: string;
    /** Reason why this function is incorrect */
    reason?: string;
}
/**
 * A parameter issue found in a script
 */
export interface ParameterIssueEntry {
    /** The function name where the issue was found */
    functionName: string;
    /** The incorrect parameter name used */
    incorrectParam: string;
    /** The correct parameter name to use */
    correctParam: string;
    /** Line number where the issue was found (1-indexed) */
    lineNumber: number;
    /** The line content containing the issue */
    lineContent: string;
    /** Reason why this parameter is incorrect */
    reason?: string;
}
/**
 * Summary of PSADT function verification
 */
export interface VerificationSummary {
    /** Total ADT function calls found in the script */
    totalAdtFunctionsFound: number;
    /** List of unique valid function names used */
    validFunctions: string[];
    /** Count of invalid function calls found */
    invalidFunctionsCount: number;
    /** Count of parameter issues found */
    parameterIssuesCount: number;
}
/**
 * Result of PSADT function verification
 */
export interface VerifyPsadtFunctionsResult {
    /** Whether all functions are valid (no invalid functions or parameter issues) */
    isValid: boolean;
    /** File path that was verified */
    filePath: string;
    /** Verification summary */
    summary: VerificationSummary;
    /** Invalid functions found (empty if all valid) */
    invalidFunctions: InvalidFunctionEntry[];
    /** Parameter issues found (empty if none) */
    parameterIssues: ParameterIssueEntry[];
}
/**
 * Output from the verify_psadt_functions tool
 */
export interface VerifyPsadtFunctionsOutput {
    /** Success indicator (false if file not found or error reading) */
    success: boolean;
    /** Error message if success is false */
    error?: string;
    /** Verification results (present if success is true) */
    result?: VerifyPsadtFunctionsResult;
}
//# sourceMappingURL=validation.d.ts.map