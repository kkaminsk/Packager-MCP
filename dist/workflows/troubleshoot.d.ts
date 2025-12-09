import type { TroubleshootArguments, TroubleshootResult } from '../types/prompts.js';
/**
 * Parse raw arguments into structured arguments
 */
export declare function parseTroubleshootArgs(rawArgs: Record<string, string>): TroubleshootArguments;
/**
 * Execute the troubleshoot workflow
 */
export declare function executeTroubleshootWorkflow(args: TroubleshootArguments): Promise<TroubleshootResult>;
/**
 * Format workflow result as user-friendly text
 */
export declare function formatTroubleshootResult(result: TroubleshootResult): string;
//# sourceMappingURL=troubleshoot.d.ts.map