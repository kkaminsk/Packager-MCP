// Bulk Lookup Workflow - Retrieve information for multiple applications at once

import { getLogger } from '../utils/logger.js';
import { getWingetService } from '../services/winget.js';
import type {
  BulkLookupArguments,
  BulkLookupResult,
  ApplicationLookup,
  OutputFormat,
} from '../types/prompts.js';
import type { InstallerType } from '../types/winget.js';

const logger = getLogger().child({ workflow: 'bulk-lookup' });

/**
 * Parse raw arguments into structured arguments
 */
export function parseBulkLookupArgs(rawArgs: Record<string, string>): BulkLookupArguments {
  return {
    applications: rawArgs['applications'] || rawArgs['apps'] || rawArgs['list'] || '',
    output: (rawArgs['output'] || rawArgs['format'] || 'markdown') as OutputFormat,
    includeVersions: rawArgs['include-versions'] === 'true' || rawArgs['includeVersions'] === 'true',
    includeInstallers: rawArgs['include-installers'] === 'true' || rawArgs['includeInstallers'] === 'true',
  };
}

/**
 * Parse application list from comma-separated string
 */
function parseApplicationList(applications: string): string[] {
  return applications
    .split(/[,;]/)
    .map(app => app.trim())
    .filter(app => app.length > 0);
}

/**
 * Look up a single application
 */
async function lookupApplication(
  query: string,
  includeVersions: boolean,
  includeInstallers: boolean
): Promise<ApplicationLookup> {
  const wingetService = getWingetService();

  try {
    // First try exact match
    let searchResult = await wingetService.searchPackages({
      query,
      exactMatch: true,
      includeVersions,
      limit: 1,
    });

    // If no exact match, try broader search
    if (searchResult.totalResults === 0) {
      searchResult = await wingetService.searchPackages({
        query,
        exactMatch: false,
        includeVersions,
        limit: 1,
      });
    }

    if (searchResult.totalResults === 0) {
      return {
        query,
        found: false,
        error: 'Package not found in Winget repository',
      };
    }

    const firstResult = searchResult.results[0]!;

    // Get full manifest for more details
    let installerType: InstallerType | undefined;
    let installerUrl: string | undefined;
    let productCode: string | undefined;
    let silentArgs: string | undefined;

    if (includeInstallers) {
      try {
        const manifest = await wingetService.getManifest(
          firstResult.packageIdentifier,
          firstResult.latestVersion
        );
        const primaryInstaller = manifest?.installers?.[0];
        installerType = primaryInstaller?.installerType;
        installerUrl = primaryInstaller?.installerUrl;
        productCode = primaryInstaller?.productCode;
        silentArgs = primaryInstaller?.installerSwitches?.silent;
      } catch {
        // Continue without installer details
      }
    }

    return {
      query,
      found: true,
      package: {
        packageId: firstResult.packageIdentifier,
        packageName: firstResult.packageName,
        publisher: firstResult.publisher,
        version: firstResult.latestVersion,
        description: firstResult.description,
        installerType,
        installerUrl,
        productCode,
        silentArgs,
        tags: firstResult.tags,
      },
    };
  } catch (error) {
    logger.error('Application lookup failed', { query, error });
    return {
      query,
      found: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Format results as CSV
 */
function formatAsCsv(results: ApplicationLookup[], includeInstallers: boolean): string {
  const headers = ['Query', 'Found', 'Package ID', 'Name', 'Publisher', 'Version'];
  if (includeInstallers) {
    headers.push('Installer Type', 'Product Code', 'Silent Args');
  }
  headers.push('Error');

  const lines: string[] = [headers.join(',')];

  for (const result of results) {
    const values: string[] = [
      escapeCSV(result.query),
      result.found ? 'Yes' : 'No',
      escapeCSV(result.package?.packageId || ''),
      escapeCSV(result.package?.packageName || ''),
      escapeCSV(result.package?.publisher || ''),
      escapeCSV(result.package?.version || ''),
    ];

    if (includeInstallers) {
      values.push(
        escapeCSV(result.package?.installerType || ''),
        escapeCSV(result.package?.productCode || ''),
        escapeCSV(result.package?.silentArgs || '')
      );
    }

    values.push(escapeCSV(result.error || ''));

    lines.push(values.join(','));
  }

  return lines.join('\n');
}

/**
 * Escape a value for CSV
 */
function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Format results as JSON
 */
function formatAsJson(results: ApplicationLookup[]): string {
  const formatted = results.map(r => ({
    query: r.query,
    found: r.found,
    ...(r.package && {
      packageId: r.package.packageId,
      packageName: r.package.packageName,
      publisher: r.package.publisher,
      version: r.package.version,
      description: r.package.description,
      installerType: r.package.installerType,
      installerUrl: r.package.installerUrl,
      productCode: r.package.productCode,
      silentArgs: r.package.silentArgs,
      tags: r.package.tags,
    }),
    ...(r.error && { error: r.error }),
  }));

  return JSON.stringify(formatted, null, 2);
}

/**
 * Format results as Markdown table
 */
function formatAsMarkdown(results: ApplicationLookup[], includeInstallers: boolean): string {
  const lines: string[] = [];

  lines.push('| Query | Status | Package ID | Name | Publisher | Version |');
  lines.push('|-------|--------|------------|------|-----------|---------|');

  for (const result of results) {
    const status = result.found ? '✓' : '✗';
    lines.push(
      `| ${escapeMarkdown(result.query)} | ${status} | ${escapeMarkdown(result.package?.packageId || '-')} | ${escapeMarkdown(result.package?.packageName || '-')} | ${escapeMarkdown(result.package?.publisher || '-')} | ${escapeMarkdown(result.package?.version || '-')} |`
    );
  }

  if (includeInstallers) {
    lines.push('');
    lines.push('### Installer Details');
    lines.push('');
    lines.push('| Package ID | Installer Type | Product Code | Silent Args |');
    lines.push('|------------|----------------|--------------|-------------|');

    for (const result of results) {
      if (result.found && result.package) {
        lines.push(
          `| ${escapeMarkdown(result.package.packageId)} | ${escapeMarkdown(result.package.installerType || '-')} | ${escapeMarkdown(result.package.productCode || '-')} | ${escapeMarkdown(result.package.silentArgs || '-')} |`
        );
      }
    }
  }

  // Add summary of not found items
  const notFound = results.filter(r => !r.found);
  if (notFound.length > 0) {
    lines.push('');
    lines.push('### Not Found');
    lines.push('');
    notFound.forEach(r => {
      lines.push(`- **${r.query}**: ${r.error || 'Not found in repository'}`);
    });
  }

  return lines.join('\n');
}

/**
 * Escape markdown special characters
 */
function escapeMarkdown(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

/**
 * Execute the bulk-lookup workflow
 */
export async function executeBulkLookupWorkflow(
  args: BulkLookupArguments
): Promise<BulkLookupResult> {
  logger.info('Starting bulk-lookup workflow', { args });

  const result: BulkLookupResult = {
    status: 'error',
    message: '',
    totalRequested: 0,
    foundCount: 0,
    notFoundCount: 0,
    results: [],
    formattedOutput: '',
    outputFormat: args.output || 'markdown',
  };

  // Parse application list
  const applications = parseApplicationList(args.applications);

  if (applications.length === 0) {
    result.message = 'No applications specified';
    result.errors = ['Please provide a comma-separated list of applications'];
    return result;
  }

  result.totalRequested = applications.length;
  logger.info('Looking up applications', { count: applications.length });

  // Look up each application in parallel (with concurrency limit)
  const CONCURRENCY_LIMIT = 5;
  const lookupResults: ApplicationLookup[] = [];

  for (let i = 0; i < applications.length; i += CONCURRENCY_LIMIT) {
    const batch = applications.slice(i, i + CONCURRENCY_LIMIT);
    const batchResults = await Promise.all(
      batch.map(app =>
        lookupApplication(
          app,
          args.includeVersions || false,
          args.includeInstallers || false
        )
      )
    );
    lookupResults.push(...batchResults);
  }

  result.results = lookupResults;
  result.foundCount = lookupResults.filter(r => r.found).length;
  result.notFoundCount = lookupResults.filter(r => !r.found).length;

  // Format output
  switch (args.output || 'markdown') {
    case 'csv':
      result.formattedOutput = formatAsCsv(lookupResults, args.includeInstallers || false);
      break;
    case 'json':
      result.formattedOutput = formatAsJson(lookupResults);
      break;
    case 'markdown':
    default:
      result.formattedOutput = formatAsMarkdown(lookupResults, args.includeInstallers || false);
      break;
  }

  // Set status and message
  if (result.foundCount === result.totalRequested) {
    result.status = 'success';
    result.message = `Successfully found all ${result.totalRequested} application(s)`;
  } else if (result.foundCount > 0) {
    result.status = 'partial';
    result.message = `Found ${result.foundCount} of ${result.totalRequested} application(s). ${result.notFoundCount} not found.`;
  } else {
    result.status = 'error';
    result.message = `None of the ${result.totalRequested} application(s) were found`;
    result.errors = lookupResults.filter(r => r.error).map(r => `${r.query}: ${r.error}`);
  }

  logger.info('Bulk-lookup workflow completed', {
    status: result.status,
    found: result.foundCount,
    notFound: result.notFoundCount,
  });

  return result;
}

/**
 * Format workflow result as user-friendly text
 */
export function formatBulkLookupResult(result: BulkLookupResult): string {
  const lines: string[] = [];

  // Header
  lines.push(`## Bulk Application Lookup`);
  lines.push('');
  lines.push(result.message);
  lines.push('');

  // Summary
  lines.push('### Summary');
  lines.push(`- **Requested**: ${result.totalRequested}`);
  lines.push(`- **Found**: ${result.foundCount}`);
  lines.push(`- **Not Found**: ${result.notFoundCount}`);
  lines.push(`- **Output Format**: ${result.outputFormat}`);
  lines.push('');

  // Results
  lines.push('### Results');
  lines.push('');
  lines.push(result.formattedOutput);
  lines.push('');

  // Warnings
  if (result.warnings && result.warnings.length > 0) {
    lines.push('### Warnings');
    result.warnings.forEach(w => lines.push(`- ${w}`));
    lines.push('');
  }

  // Errors
  if (result.errors && result.errors.length > 0) {
    lines.push('### Errors');
    result.errors.forEach(e => lines.push(`- ${e}`));
    lines.push('');
  }

  return lines.join('\n');
}
