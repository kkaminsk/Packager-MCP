import type { BulkLookupArguments, BulkLookupResult } from '../types/prompts.js';
/**
 * Parse raw arguments into structured arguments
 */
export declare function parseBulkLookupArgs(rawArgs: Record<string, string>): BulkLookupArguments;
/**
 * Execute the bulk-lookup workflow
 */
export declare function executeBulkLookupWorkflow(args: BulkLookupArguments): Promise<BulkLookupResult>;
/**
 * Format workflow result as user-friendly text
 */
export declare function formatBulkLookupResult(result: BulkLookupResult): string;
//# sourceMappingURL=bulk-lookup.d.ts.map