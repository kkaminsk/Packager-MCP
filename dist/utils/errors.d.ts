export declare class McpError extends Error {
    readonly code: string;
    readonly details?: Record<string, unknown> | undefined;
    constructor(message: string, code: string, details?: Record<string, unknown> | undefined);
}
export declare class ConfigError extends McpError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class CacheError extends McpError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class ValidationError extends McpError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class GithubApiError extends McpError {
    readonly statusCode?: number | undefined;
    constructor(message: string, statusCode?: number | undefined, details?: Record<string, unknown>);
}
export declare class ToolError extends McpError {
    readonly toolName: string;
    constructor(message: string, toolName: string, details?: Record<string, unknown>);
}
export declare class ResourceError extends McpError {
    readonly resourceUri: string;
    constructor(message: string, resourceUri: string, details?: Record<string, unknown>);
}
export declare function formatErrorForClient(error: unknown): string;
//# sourceMappingURL=errors.d.ts.map