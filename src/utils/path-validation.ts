import { resolve, normalize } from 'node:path';
import { ToolError } from './errors.js';

/**
 * Validate that a path does not contain traversal sequences and optionally
 * falls within one of the allowed base directories.
 */
function validatePath(
  rawPath: string,
  toolName: string,
  allowedDirs?: string[]
): string {
  if (!rawPath || rawPath.trim().length === 0) {
    throw new ToolError('Path must not be empty', toolName);
  }

  const resolved = resolve(rawPath);
  const normalized = normalize(rawPath);

  // Reject explicit traversal sequences in the raw input
  if (rawPath.includes('..')) {
    throw new ToolError(
      `Path traversal ("..") is not allowed: ${rawPath}`,
      toolName
    );
  }

  // If allowed directories are configured, enforce containment
  if (allowedDirs && allowedDirs.length > 0) {
    const resolvedAllowed = allowedDirs.map((d) => resolve(d));
    const isAllowed = resolvedAllowed.some(
      (allowed) =>
        resolved === allowed || resolved.startsWith(allowed + '\\') || resolved.startsWith(allowed + '/')
    );
    if (!isAllowed) {
      throw new ToolError(
        `Path "${resolved}" is outside the allowed directories: ${resolvedAllowed.join(', ')}`,
        toolName
      );
    }
  }

  return resolved;
}

/**
 * Validate a path intended for writing output files.
 * Rejects traversal and optionally enforces allowed output directories.
 */
export function validateOutputPath(
  rawPath: string,
  toolName: string,
  allowedDirs?: string[]
): string {
  return validatePath(rawPath, toolName, allowedDirs);
}

/**
 * Validate a path intended for reading files.
 * Rejects traversal sequences.
 */
export function validateReadPath(
  rawPath: string,
  toolName: string
): string {
  return validatePath(rawPath, toolName);
}
