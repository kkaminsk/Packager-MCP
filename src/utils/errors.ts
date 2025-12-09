export class McpError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'McpError';
  }
}

export class ConfigError extends McpError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CONFIG_ERROR', details);
    this.name = 'ConfigError';
  }
}

export class CacheError extends McpError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CACHE_ERROR', details);
    this.name = 'CacheError';
  }
}

export class ValidationError extends McpError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class GithubApiError extends McpError {
  constructor(
    message: string,
    public readonly statusCode?: number,
    details?: Record<string, unknown>
  ) {
    super(message, 'GITHUB_API_ERROR', { ...details, statusCode });
    this.name = 'GithubApiError';
  }
}

export class ToolError extends McpError {
  constructor(
    message: string,
    public readonly toolName: string,
    details?: Record<string, unknown>
  ) {
    super(message, 'TOOL_ERROR', { ...details, toolName });
    this.name = 'ToolError';
  }
}

export class ResourceError extends McpError {
  constructor(
    message: string,
    public readonly resourceUri: string,
    details?: Record<string, unknown>
  ) {
    super(message, 'RESOURCE_ERROR', { ...details, resourceUri });
    this.name = 'ResourceError';
  }
}

export class DownloadError extends McpError {
  constructor(
    message: string,
    public readonly url?: string,
    public readonly statusCode?: number,
    details?: Record<string, unknown>
  ) {
    super(message, 'DOWNLOAD_ERROR', { ...details, url, statusCode });
    this.name = 'DownloadError';
  }
}

export class HashVerificationError extends McpError {
  constructor(
    message: string,
    public readonly expectedHash: string,
    public readonly actualHash: string,
    details?: Record<string, unknown>
  ) {
    super(message, 'HASH_VERIFICATION_ERROR', { ...details, expectedHash, actualHash });
    this.name = 'HashVerificationError';
  }
}

export class ExtractionError extends McpError {
  constructor(
    message: string,
    public readonly archivePath?: string,
    details?: Record<string, unknown>
  ) {
    super(message, 'EXTRACTION_ERROR', { ...details, archivePath });
    this.name = 'ExtractionError';
  }
}

export function formatErrorForClient(error: unknown): string {
  if (error instanceof McpError) {
    return `[${error.code}] ${error.message}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
