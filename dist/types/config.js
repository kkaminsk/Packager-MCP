export const DEFAULT_CONFIG = {
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
//# sourceMappingURL=config.js.map