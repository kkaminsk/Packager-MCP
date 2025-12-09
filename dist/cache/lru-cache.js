export class LruCache {
    cache;
    maxSize;
    defaultTtlMs;
    constructor(config) {
        this.cache = new Map();
        this.maxSize = config.maxSize;
        this.defaultTtlMs = config.defaultTtlMs;
    }
    get(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            return undefined;
        }
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return undefined;
        }
        // Move to end for LRU ordering
        this.cache.delete(key);
        this.cache.set(key, entry);
        return entry.value;
    }
    set(key, value, ttlMs) {
        // Remove existing entry to reset LRU order
        this.cache.delete(key);
        // Evict oldest entries if at capacity
        while (this.cache.size >= this.maxSize) {
            const oldestKey = this.cache.keys().next().value;
            if (oldestKey !== undefined) {
                this.cache.delete(oldestKey);
            }
        }
        const expiresAt = Date.now() + (ttlMs ?? this.defaultTtlMs);
        this.cache.set(key, { value, expiresAt });
    }
    has(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            return false;
        }
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return false;
        }
        return true;
    }
    delete(key) {
        return this.cache.delete(key);
    }
    clear() {
        this.cache.clear();
    }
    size() {
        this.pruneExpired();
        return this.cache.size;
    }
    keys() {
        this.pruneExpired();
        return Array.from(this.cache.keys());
    }
    pruneExpired() {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.cache.delete(key);
            }
        }
    }
}
export class CacheManager {
    caches;
    config;
    constructor(config) {
        this.caches = new Map();
        this.config = config;
    }
    getCache(namespace) {
        let cache = this.caches.get(namespace);
        if (!cache) {
            cache = new LruCache(this.config);
            this.caches.set(namespace, cache);
        }
        return cache;
    }
    getManifestCache() {
        const cache = this.getCache('manifests');
        return cache;
    }
    getSearchCache() {
        const cache = this.getCache('search');
        return cache;
    }
    clearAll() {
        for (const cache of this.caches.values()) {
            cache.clear();
        }
    }
}
let cacheManager;
export function initCacheManager(config) {
    cacheManager = new CacheManager(config);
    return cacheManager;
}
export function getCacheManager() {
    if (!cacheManager) {
        throw new Error('CacheManager not initialized. Call initCacheManager first.');
    }
    return cacheManager;
}
//# sourceMappingURL=lru-cache.js.map