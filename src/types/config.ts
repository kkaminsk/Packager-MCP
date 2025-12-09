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
  download: {
    largeFileSizeThreshold: 500 * 1024 * 1024, // 500MB
    timeoutMs: 5 * 60 * 1000, // 5 minutes
  },
};
