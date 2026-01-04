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
export interface PsadtConfig {
    cacheDirectory?: string;
    cacheTtlHours: number;
    defaultVersion: string;
}
export type TransportType = 'stdio' | 'http' | 'both';
export interface TransportConfig {
    /** Transport type: 'stdio' (default), 'http', or 'both' */
    type: TransportType;
    /** HTTP server port (default: 8081) */
    port: number;
    /** HTTP server host binding (default: '127.0.0.1') */
    host: string;
    /** Session timeout in milliseconds (default: 30 minutes) */
    sessionTimeoutMs: number;
}
export interface ServerConfig {
    name: string;
    version: string;
    cache: CacheConfig;
    logging: LoggingConfig;
    github: GithubConfig;
    psadt?: PsadtConfig;
    transport: TransportConfig;
}
export declare const DEFAULT_CONFIG: ServerConfig;
//# sourceMappingURL=config.d.ts.map