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
const defaultCacheConfig = {
    maxSize: 1000,
    defaultTtlMs: 15 * 60 * 1000,
    manifestTtlMs: 60 * 60 * 1000,
    searchTtlMs: 15 * 60 * 1000,
};
const defaultLoggingConfig = {
    level: 'info',
    format: 'json',
};
const defaultGithubConfig = {
    rateLimitRetries: 3,
};
export const serverConfigSchema = z.object({
    name: z.string().default('intune-packaging-assistant'),
    version: z.string().default('1.0.0'),
    cache: cacheConfigSchema.default(defaultCacheConfig),
    logging: loggingConfigSchema.default(defaultLoggingConfig),
    github: githubConfigSchema.default(defaultGithubConfig),
});
//# sourceMappingURL=schema.js.map