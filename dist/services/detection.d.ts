import type { DetectionType, FileDetectionInput, RegistryDetectionInput, MsiDetectionInput, ScriptDetectionInput, GenerateIntuneDetectionInput, GenerateIntuneDetectionOutput } from '../types/intune.js';
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