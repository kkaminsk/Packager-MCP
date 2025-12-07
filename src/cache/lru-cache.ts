import type { CacheConfig } from '../types/config.js';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class LruCache<T = unknown> {
  private cache: Map<string, CacheEntry<T>>;
  private readonly maxSize: number;
  private readonly defaultTtlMs: number;

  constructor(config: CacheConfig) {
    this.cache = new Map();
    this.maxSize = config.maxSize;
    this.defaultTtlMs = config.defaultTtlMs;
  }

  get(key: string): T | undefined {
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

  set(key: string, value: T, ttlMs?: number): void {
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

  has(key: string): boolean {
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

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    this.pruneExpired();
    return this.cache.size;
  }

  keys(): string[] {
    this.pruneExpired();
    return Array.from(this.cache.keys());
  }

  private pruneExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

export class CacheManager {
  private caches: Map<string, LruCache>;
  private config: CacheConfig;

  constructor(config: CacheConfig) {
    this.caches = new Map();
    this.config = config;
  }

  getCache<T>(namespace: string): LruCache<T> {
    let cache = this.caches.get(namespace) as LruCache<T> | undefined;
    if (!cache) {
      cache = new LruCache<T>(this.config);
      this.caches.set(namespace, cache as LruCache);
    }
    return cache;
  }

  getManifestCache<T>(): LruCache<T> {
    const cache = this.getCache<T>('manifests');
    return cache;
  }

  getSearchCache<T>(): LruCache<T> {
    const cache = this.getCache<T>('search');
    return cache;
  }

  clearAll(): void {
    for (const cache of this.caches.values()) {
      cache.clear();
    }
  }
}

let cacheManager: CacheManager | undefined;

export function initCacheManager(config: CacheConfig): CacheManager {
  cacheManager = new CacheManager(config);
  return cacheManager;
}

export function getCacheManager(): CacheManager {
  if (!cacheManager) {
    throw new Error('CacheManager not initialized. Call initCacheManager first.');
  }
  return cacheManager;
}
