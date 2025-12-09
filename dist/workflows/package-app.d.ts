import type { PackageAppArguments, PackageAppResult } from '../types/prompts.js';
/**
 * Parse raw arguments string into structured arguments
 */
export declare function parsePackageAppArgs(rawArgs: Record<string, string>): PackageAppArguments;
/**
 * Execute the package-app workflow
 */
export declare function executePackageAppWorkflow(args: PackageAppArguments): Promise<PackageAppResult>;
/**
 * Format workflow result as user-friendly text
 */
export declare function formatPackageAppResult(result: PackageAppResult): string;
//# sourceMappingURL=package-app.d.ts.map