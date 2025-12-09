import type { CacheConfig } from '../types/config.js';
export declare class LruCache<T = unknown> {
    private cache;
    private readonly maxSize;
    private readonly defaultTtlMs;
    constructor(config: CacheConfig);
    get(key: string): T | undefined;
    set(key: string, value: T, ttlMs?: number): void;
    has(key: string): boolean;
    delete(key: string): boolean;
    clear(): void;
    size(): number;
    keys(): string[];
    private pruneExpired;
}
export declare class CacheManager {
    private caches;
    private config;
    constructor(config: CacheConfig);
    getCache<T>(namespace: string): LruCache<T>;
    getManifestCache<T>(): LruCache<T>;
    getSearchCache<T>(): LruCache<T>;
    clearAll(): void;
}
export declare function initCacheManager(config: CacheConfig): CacheManager;
export declare function getCacheManager(): CacheManager;
//# sourceMappingURL=lru-cache.d.ts.map