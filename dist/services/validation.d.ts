import type { ValidatePackageInput, ValidatePackageOutput, VerifyPsadtFunctionsInput, VerifyPsadtFunctionsOutput } from '../types/validation.js';
/**
 * Validation service class
 */
declare class ValidationService {
    /**
     * Verify PSADT function names in a script file
     */
    verifyPsadtFunctions(input: VerifyPsadtFunctionsInput): Promise<VerifyPsadtFunctionsOutput>;
    /**
     * Validate a PSADT script
     */
    validatePackage(input: ValidatePackageInput): Promise<ValidatePackageOutput>;
}
/**
 * Get the validation service instance
 */
export declare function getValidationService(): ValidationService;
/**
 * Reset the validation service (for testing)
 */
export declare function resetValidationService(): void;
export { ValidationService };
//# sourceMappingURL=validation.d.ts.map