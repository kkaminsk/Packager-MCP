import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LruCache, CacheManager } from '../cache/lru-cache.js';
const defaultConfig = {
    maxSize: 3,
    defaultTtlMs: 1000,
    manifestTtlMs: 2000,
    searchTtlMs: 500,
};
describe('LruCache', () => {
    let cache;
    beforeEach(() => {
        cache = new LruCache(defaultConfig);
        vi.useFakeTimers();
    });
    it('should store and retrieve values', () => {
        cache.set('key1', 'value1');
        expect(cache.get('key1')).toBe('value1');
    });
    it('should return undefined for missing keys', () => {
        expect(cache.get('nonexistent')).toBeUndefined();
    });
    it('should evict oldest entries when at capacity', () => {
        cache.set('key1', 'value1');
        cache.set('key2', 'value2');
        cache.set('key3', 'value3');
        cache.set('key4', 'value4');
        expect(cache.get('key1')).toBeUndefined();
        expect(cache.get('key2')).toBe('value2');
        expect(cache.get('key3')).toBe('value3');
        expect(cache.get('key4')).toBe('value4');
    });
    it('should expire entries after TTL', () => {
        cache.set('key1', 'value1', 500);
        expect(cache.get('key1')).toBe('value1');
        vi.advanceTimersByTime(600);
        expect(cache.get('key1')).toBeUndefined();
    });
    it('should update LRU order on access', () => {
        cache.set('key1', 'value1');
        cache.set('key2', 'value2');
        cache.set('key3', 'value3');
        // Access key1 to make it most recently used
        cache.get('key1');
        // Add new key, should evict key2 (oldest)
        cache.set('key4', 'value4');
        expect(cache.get('key1')).toBe('value1');
        expect(cache.get('key2')).toBeUndefined();
        expect(cache.get('key3')).toBe('value3');
        expect(cache.get('key4')).toBe('value4');
    });
    it('should check existence with has()', () => {
        cache.set('key1', 'value1');
        expect(cache.has('key1')).toBe(true);
        expect(cache.has('nonexistent')).toBe(false);
    });
    it('should delete entries', () => {
        cache.set('key1', 'value1');
        expect(cache.delete('key1')).toBe(true);
        expect(cache.get('key1')).toBeUndefined();
        expect(cache.delete('nonexistent')).toBe(false);
    });
    it('should clear all entries', () => {
        cache.set('key1', 'value1');
        cache.set('key2', 'value2');
        cache.clear();
        expect(cache.size()).toBe(0);
    });
    it('should return correct size', () => {
        expect(cache.size()).toBe(0);
        cache.set('key1', 'value1');
        expect(cache.size()).toBe(1);
        cache.set('key2', 'value2');
        expect(cache.size()).toBe(2);
    });
    it('should return keys', () => {
        cache.set('key1', 'value1');
        cache.set('key2', 'value2');
        const keys = cache.keys();
        expect(keys).toContain('key1');
        expect(keys).toContain('key2');
    });
});
describe('CacheManager', () => {
    let manager;
    beforeEach(() => {
        manager = new CacheManager(defaultConfig);
    });
    it('should create and return named caches', () => {
        const cache1 = manager.getCache('test1');
        const cache2 = manager.getCache('test2');
        cache1.set('key', 'value1');
        cache2.set('key', 'value2');
        expect(cache1.get('key')).toBe('value1');
        expect(cache2.get('key')).toBe('value2');
    });
    it('should return the same cache instance for same namespace', () => {
        const cache1 = manager.getCache('test');
        const cache2 = manager.getCache('test');
        expect(cache1).toBe(cache2);
    });
    it('should provide manifest cache helper', () => {
        const cache = manager.getManifestCache();
        cache.set('manifest1', 'data');
        expect(cache.get('manifest1')).toBe('data');
    });
    it('should provide search cache helper', () => {
        const cache = manager.getSearchCache();
        cache.set('search1', 'results');
        expect(cache.get('search1')).toBe('results');
    });
    it('should clear all caches', () => {
        const cache1 = manager.getCache('test1');
        const cache2 = manager.getCache('test2');
        cache1.set('key', 'value');
        cache2.set('key', 'value');
        manager.clearAll();
        expect(cache1.size()).toBe(0);
        expect(cache2.size()).toBe(0);
    });
});
//# sourceMappingURL=lru-cache.test.js.map