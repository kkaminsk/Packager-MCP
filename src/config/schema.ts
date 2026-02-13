import { z } from 'zod';

export const cacheConfigSchema = z.object({
  maxSize: z.number().min(1).default(1000),
  defaultTtlMs: z.number().min(0).default(15 * 60 * 1000),
  manifestTtlMs: z.number().min(0).default(60 * 60 * 1000),
  searchTtlMs: z.number().min(0).default(15 * 60 * 1000),
});

export const loggingConfigSchema = z.object({
  level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  format: z.enum(['json', 'text']).default('json'),
});

export const githubConfigSchema = z.object({
  token: z.string().optional(),
  rateLimitRetries: z.number().min(0).default(3),
});

export const psadtConfigSchema = z.object({
  cacheDirectory: z.string().optional(),
  cacheTtlHours: z.number().min(1).default(24),
  defaultVersion: z.string().default('latest'),
});

export const securityConfigSchema = z.object({
  allowedOutputDirs: z.array(z.string()).optional(),
});

export const transportConfigSchema = z.object({
  type: z.enum(['stdio', 'http', 'both']).default('stdio'),
  port: z.number().min(1).max(65535).default(8081),
  host: z.string().default('127.0.0.1'),
  sessionTimeoutMs: z.number().min(0).default(30 * 60 * 1000),
  corsOrigin: z.string().default('http://localhost'),
});

const defaultCacheConfig = {
  maxSize: 1000,
  defaultTtlMs: 15 * 60 * 1000,
  manifestTtlMs: 60 * 60 * 1000,
  searchTtlMs: 15 * 60 * 1000,
};

const defaultLoggingConfig = {
  level: 'info' as const,
  format: 'json' as const,
};

const defaultGithubConfig = {
  rateLimitRetries: 3,
};

const defaultPsadtConfig = {
  cacheTtlHours: 24,
  defaultVersion: 'latest',
};

const defaultTransportConfig = {
  type: 'stdio' as const,
  port: 8081,
  host: '127.0.0.1',
  sessionTimeoutMs: 30 * 60 * 1000,
  corsOrigin: 'http://localhost',
};

export const serverConfigSchema = z.object({
  name: z.string().default('intune-packaging-assistant'),
  version: z.string().default('1.0.0'),
  cache: cacheConfigSchema.default(defaultCacheConfig),
  logging: loggingConfigSchema.default(defaultLoggingConfig),
  github: githubConfigSchema.default(defaultGithubConfig),
  psadt: psadtConfigSchema.optional().default(defaultPsadtConfig),
  transport: transportConfigSchema.default(defaultTransportConfig),
  security: securityConfigSchema.optional(),
});

export type ServerConfigInput = z.input<typeof serverConfigSchema>;
export type ServerConfigOutput = z.output<typeof serverConfigSchema>;
