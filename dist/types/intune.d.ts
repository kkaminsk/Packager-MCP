/**
 * Detection types supported by Intune
 */
export type DetectionType = 'file' | 'registry' | 'msi' | 'script';
/**
 * Comparison operators for version and value checks
 */
export type ComparisonOperator = 'equal' | 'notEqual' | 'greaterThan' | 'greaterThanOrEqual' | 'lessThan' | 'lessThanOrEqual';
/**
 * File detection type options
 */
export type FileDetectionType = 'exists' | 'version' | 'sizeInMB' | 'modifiedDate';
/**
 * Registry detection value types
 */
export type RegistryValueType = 'string' | 'integer' | 'version';
/**
 * Input for file-based detection
 */
export interface FileDetectionInput {
    /** Directory path containing the file */
    path: string;
    /** File or folder name to check */
    fileOrFolderName: string;
    /** Whether to check 32-bit location on 64-bit systems */
    check32BitOn64System?: boolean;
    /** Type of check to perform */
    detectionType?: FileDetectionType;
    /** Comparison operator */
    operator?: ComparisonOperator;
    /** Value to compare against (version string, size in MB, or date) */
    detectionValue?: string;
}
/**
 * Input for registry-based detection
 */
export interface RegistryDetectionInput {
    /** Registry key path (e.g., HKEY_LOCAL_MACHINE\SOFTWARE\App) */
    keyPath: string;
    /** Registry value name (empty string for default value) */
    valueName?: string;
    /** Whether to check 32-bit registry on 64-bit systems */
    check32BitOn64System?: boolean;
    /** Type of value detection */
    detectionType?: 'exists' | RegistryValueType;
    /** Comparison operator for value comparison */
    operator?: ComparisonOperator;
    /** Value to compare against */
    detectionValue?: string;
}
/**
 * Input for MSI product code detection
 */
export interface MsiDetectionInput {
    /** MSI product code GUID (e.g., {xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx}) */
    productCode: string;
    /** Version comparison operator */
    productVersionOperator?: ComparisonOperator;
    /** Version to compare against */
    productVersion?: string;
}
/**
 * Input for script-based detection
 */
export interface ScriptDetectionInput {
    /** Application name for the script */
    applicationName: string;
    /** Path to check for the application */
    installPath?: string;
    /** File to check (e.g., app.exe) */
    fileName?: string;
    /** Version requirement */
    version?: string;
    /** Version comparison operator */
    operator?: ComparisonOperator;
    /** Registry key to check (alternative to file) */
    registryKey?: string;
    /** Registry value name */
    registryValueName?: string;
}
/**
 * Input for the generate_intune_detection tool
 */
export interface GenerateIntuneDetectionInput {
    /** Type of detection rule to generate */
    detectionType: DetectionType;
    /** File detection parameters */
    file?: FileDetectionInput;
    /** Registry detection parameters */
    registry?: RegistryDetectionInput;
    /** MSI detection parameters */
    msi?: MsiDetectionInput;
    /** Script detection parameters */
    script?: ScriptDetectionInput;
}
/**
 * Intune Graph API file detection format
 */
export interface IntuneFileDetection {
    '@odata.type': '#microsoft.graph.win32LobAppFileSystemDetection';
    path: string;
    fileOrFolderName: string;
    check32BitOn64System: boolean;
    detectionType: string;
    operator?: string;
    detectionValue?: string;
}
/**
 * Intune Graph API registry detection format
 */
export interface IntuneRegistryDetection {
    '@odata.type': '#microsoft.graph.win32LobAppRegistryDetection';
    keyPath: string;
    valueName: string;
    check32BitOn64System: boolean;
    detectionType: string;
    operator?: string;
    detectionValue?: string;
}
/**
 * Intune Graph API MSI product code detection format
 */
export interface IntuneMsiDetection {
    '@odata.type': '#microsoft.graph.win32LobAppProductCodeDetection';
    productCode: string;
    productVersionOperator: string;
    productVersion: string;
}
/**
 * Union of all Intune detection types
 */
export type IntuneDetectionRule = IntuneFileDetection | IntuneRegistryDetection | IntuneMsiDetection;
/**
 * Detection type recommendation
 */
export interface DetectionRecommendation {
    /** Recommended detection type */
    recommendedType: DetectionType;
    /** Reason for recommendation */
    reason: string;
    /** Alternative options */
    alternatives: Array<{
        type: DetectionType;
        reason: string;
    }>;
}
/**
 * Output from the generate_intune_detection tool
 */
export interface GenerateIntuneDetectionOutput {
    /** Success indicator */
    success: boolean;
    /** Detection method description */
    detectionMethod: string;
    /** Type-specific configuration */
    configuration: {
        type: DetectionType;
        details: FileDetectionInput | RegistryDetectionInput | MsiDetectionInput | ScriptDetectionInput;
    };
    /** Intune Graph API compatible JSON */
    intuneJson: IntuneDetectionRule | null;
    /** PowerShell detection script (for script type, or as alternative for others) */
    powershellScript: string;
    /** Recommendations for best practices */
    recommendations: string[];
}
//# sourceMappingURL=intune.d.ts.map