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
export interface DownloadConfig {
    largeFileSizeThreshold: number;
    timeoutMs: number;
}
export interface PsadtConfig {
    cacheDirectory?: string;
    cacheTtlHours: number;
    defaultVersion: string;
}
export interface ServerConfig {
    name: string;
    version: string;
    cache: CacheConfig;
    logging: LoggingConfig;
    github: GithubConfig;
    download: DownloadConfig;
    psadt?: PsadtConfig;
}
export declare const DEFAULT_CONFIG: ServerConfig;
//# sourceMappingURL=config.d.ts.map