import type { DetectionType, FileDetectionInput, RegistryDetectionInput, MsiDetectionInput, ScriptDetectionInput, GenerateIntuneDetectionInput, GenerateIntuneDetectionOutput } from '../types/intune.js';
/**
 * Validate and normalize a Windows file version to 4-part format.
 * Windows file versions use major.minor.build.revision format (e.g., 7.13.0.0).
 * Intune's win32LobAppFileSystemDetection requires the full 4-part format.
 *
 * @param version - Version string to normalize
 * @returns Object with normalized version and whether it was modified
 */
export declare function normalizeFileVersion(version: string): {
    normalized: string;
    wasModified: boolean;
    error?: string;
};
/**
 * Check if a version string is a valid Windows file version format.
 *
 * @param version - Version string to validate
 * @returns Object with isValid flag and optional error message
 */
export declare function isValidFileVersion(version: string): {
    isValid: boolean;
    error?: string;
};
/**
 * Detection service class
 */
declare class DetectionService {
    /**
     * Generate Intune detection rule based on input
     */
    generateDetection(input: GenerateIntuneDetectionInput): Promise<GenerateIntuneDetectionOutput>;
    /**
     * Generate file-based detection rule
     */
    generateFileDetection(input: FileDetectionInput): GenerateIntuneDetectionOutput;
    /**
     * Generate registry-based detection rule
     */
    generateRegistryDetection(input: RegistryDetectionInput): GenerateIntuneDetectionOutput;
    /**
     * Generate MSI product code detection rule
     */
    generateMsiDetection(input: MsiDetectionInput): GenerateIntuneDetectionOutput;
    /**
     * Generate script-based detection rule
     */
    generateScriptDetection(input: ScriptDetectionInput): GenerateIntuneDetectionOutput;
    /**
     * Recommend the best detection type based on installer characteristics
     */
    recommendDetectionType(installerType?: string, hasProductCode?: boolean, hasVersionFile?: boolean): {
        recommended: DetectionType;
        reason: string;
        alternatives: Array<{
            type: DetectionType;
            reason: string;
        }>;
    };
}
/**
 * Get the detection service instance
 */
export declare function getDetectionService(): DetectionService;
/**
 * Reset the detection service (for testing)
 */
export declare function resetDetectionService(): void;
export { DetectionService };
//# sourceMappingURL=detection.d.ts.map