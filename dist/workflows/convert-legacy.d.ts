import type { ConvertLegacyArguments, ConvertLegacyResult } from '../types/prompts.js';
/**
 * Parse raw arguments into structured arguments
 */
export declare function parseConvertLegacyArgs(rawArgs: Record<string, string>): ConvertLegacyArguments;
/**
 * Execute the convert-legacy workflow
 */
export declare function executeConvertLegacyWorkflow(args: ConvertLegacyArguments): Promise<ConvertLegacyResult>;
/**
 * Format workflow result as user-friendly text
 */
export declare function formatConvertLegacyResult(result: ConvertLegacyResult): string;
//# sourceMappingURL=convert-legacy.d.ts.map