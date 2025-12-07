export interface CacheConfig {
    maxSize: number;
    defaultTtlMs: number;
    manifestTtlMs: number;
    searchTtlMs: number;
}
export interface LoggingConfig {
    level: 'debug' | 'info' | 'warn' | 'error';
    format: 'json' | 'text';
}
export interface GithubConfig {
    token?: string;
    rateLimitRetries: number;
}
export interface ServerConfig {
    name: string;
    version: string;
    cache: CacheConfig;
    logging: LoggingConfig;
    github: GithubConfig;
}
export declare const DEFAULT_CONFIG: ServerConfig;
//# sourceMappingURL=config.d.ts.map