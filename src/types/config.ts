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
  /** CORS allowed origin (default: 'http://localhost') */
  corsOrigin: string;
}

export interface SecurityConfig {
  /** Allowed output directories for tool file operations */
  allowedOutputDirs?: string[];
}

export interface ServerConfig {
  name: string;
  version: string;
  cache: CacheConfig;
  logging: LoggingConfig;
  github: GithubConfig;
  psadt?: PsadtConfig;
  transport: TransportConfig;
  security?: SecurityConfig;
}

export const DEFAULT_CONFIG: ServerConfig = {
  name: 'intune-packaging-assistant',
  version: '1.0.0',
  cache: {
    maxSize: 1000,
    defaultTtlMs: 15 * 60 * 1000, // 15 minutes
    manifestTtlMs: 60 * 60 * 1000, // 1 hour
    searchTtlMs: 15 * 60 * 1000, // 15 minutes
  },
  logging: {
    level: 'info',
    format: 'json',
  },
  github: {
    rateLimitRetries: 3,
  },
  transport: {
    type: 'stdio',
    port: 8081,
    host: '127.0.0.1',
    sessionTimeoutMs: 30 * 60 * 1000, // 30 minutes
    corsOrigin: 'http://localhost',
  },
};
