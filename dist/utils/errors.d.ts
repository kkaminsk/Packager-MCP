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
export declare class DownloadError extends McpError {
    readonly url?: string | undefined;
    readonly statusCode?: number | undefined;
    constructor(message: string, url?: string | undefined, statusCode?: number | undefined, details?: Record<string, unknown>);
}
export declare class ExtractionError extends McpError {
    readonly archivePath?: string | undefined;
    constructor(message: string, archivePath?: string | undefined, details?: Record<string, unknown>);
}
export declare function formatErrorForClient(error: unknown): string;
//# sourceMappingURL=errors.d.ts.map