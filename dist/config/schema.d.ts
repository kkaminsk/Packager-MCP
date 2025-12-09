import { z } from 'zod';
export declare const cacheConfigSchema: z.ZodObject<{
    maxSize: z.ZodDefault<z.ZodNumber>;
    defaultTtlMs: z.ZodDefault<z.ZodNumber>;
    manifestTtlMs: z.ZodDefault<z.ZodNumber>;
    searchTtlMs: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export declare const loggingConfigSchema: z.ZodObject<{
    level: z.ZodDefault<z.ZodEnum<{
        error: "error";
        debug: "debug";
        info: "info";
        warn: "warn";
    }>>;
    format: z.ZodDefault<z.ZodEnum<{
        json: "json";
        text: "text";
    }>>;
}, z.core.$strip>;
export declare const githubConfigSchema: z.ZodObject<{
    token: z.ZodOptional<z.ZodString>;
    rateLimitRetries: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export declare const psadtConfigSchema: z.ZodObject<{
    cacheDirectory: z.ZodOptional<z.ZodString>;
    cacheTtlHours: z.ZodDefault<z.ZodNumber>;
    defaultVersion: z.ZodDefault<z.ZodString>;
}, z.core.$strip>;
export declare const serverConfigSchema: z.ZodObject<{
    name: z.ZodDefault<z.ZodString>;
    version: z.ZodDefault<z.ZodString>;
    cache: z.ZodDefault<z.ZodObject<{
        maxSize: z.ZodDefault<z.ZodNumber>;
        defaultTtlMs: z.ZodDefault<z.ZodNumber>;
        manifestTtlMs: z.ZodDefault<z.ZodNumber>;
        searchTtlMs: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>>;
    logging: z.ZodDefault<z.ZodObject<{
        level: z.ZodDefault<z.ZodEnum<{
            error: "error";
            debug: "debug";
            info: "info";
            warn: "warn";
        }>>;
        format: z.ZodDefault<z.ZodEnum<{
            json: "json";
            text: "text";
        }>>;
    }, z.core.$strip>>;
    github: z.ZodDefault<z.ZodObject<{
        token: z.ZodOptional<z.ZodString>;
        rateLimitRetries: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>>;
    psadt: z.ZodDefault<z.ZodOptional<z.ZodObject<{
        cacheDirectory: z.ZodOptional<z.ZodString>;
        cacheTtlHours: z.ZodDefault<z.ZodNumber>;
        defaultVersion: z.ZodDefault<z.ZodString>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export type ServerConfigInput = z.input<typeof serverConfigSchema>;
export type ServerConfigOutput = z.output<typeof serverConfigSchema>;
//# sourceMappingURL=schema.d.ts.map