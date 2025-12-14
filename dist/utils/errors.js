export class McpError extends Error {
    code;
    details;
    constructor(message, code, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'McpError';
    }
}
export class ConfigError extends McpError {
    constructor(message, details) {
        super(message, 'CONFIG_ERROR', details);
        this.name = 'ConfigError';
    }
}
export class CacheError extends McpError {
    constructor(message, details) {
        super(message, 'CACHE_ERROR', details);
        this.name = 'CacheError';
    }
}
export class ValidationError extends McpError {
    constructor(message, details) {
        super(message, 'VALIDATION_ERROR', details);
        this.name = 'ValidationError';
    }
}
export class GithubApiError extends McpError {
    statusCode;
    constructor(message, statusCode, details) {
        super(message, 'GITHUB_API_ERROR', { ...details, statusCode });
        this.statusCode = statusCode;
        this.name = 'GithubApiError';
    }
}
export class ToolError extends McpError {
    toolName;
    constructor(message, toolName, details) {
        super(message, 'TOOL_ERROR', { ...details, toolName });
        this.toolName = toolName;
        this.name = 'ToolError';
    }
}
export class ResourceError extends McpError {
    resourceUri;
    constructor(message, resourceUri, details) {
        super(message, 'RESOURCE_ERROR', { ...details, resourceUri });
        this.resourceUri = resourceUri;
        this.name = 'ResourceError';
    }
}
export function formatErrorForClient(error) {
    if (error instanceof McpError) {
        return `[${error.code}] ${error.message}`;
    }
    if (error instanceof Error) {
        return error.message;
    }
    return String(error);
}
//# sourceMappingURL=errors.js.map