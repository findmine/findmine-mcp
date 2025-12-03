import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Cache } from '../../src/utils/cache.js';

describe('Cache', () => {
  let cache: Cache<string>;

  beforeEach(() => {
    // Create a cache with 1000ms TTL for testing
    cache = new Cache<string>(1000);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('set and get', () => {
    it('should store and retrieve a value', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should store multiple values', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      expect(cache.get('key1')).toBe('value1');
      expect(cache.get('key2')).toBe('value2');
      expect(cache.get('key3')).toBe('value3');
    });

    it('should overwrite existing values', () => {
      cache.set('key1', 'original');
      cache.set('key1', 'updated');

      expect(cache.get('key1')).toBe('updated');
    });

    it('should return undefined for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeUndefined();
    });
  });

  describe('TTL expiration', () => {
    it('should return value before TTL expires', () => {
      cache.set('key1', 'value1');

      // Advance time but not past TTL
      vi.advanceTimersByTime(500);

      expect(cache.get('key1')).toBe('value1');
    });

    it('should return undefined after TTL expires', () => {
      cache.set('key1', 'value1');

      // Advance time past TTL
      vi.advanceTimersByTime(1001);

      expect(cache.get('key1')).toBeUndefined();
    });

    it('should delete expired entry on get', () => {
      cache.set('key1', 'value1');
      expect(cache.size()).toBe(1);

      // Advance time past TTL
      vi.advanceTimersByTime(1001);

      // Getting the expired key should delete it
      cache.get('key1');
      expect(cache.size()).toBe(0);
    });

    it('should handle different TTL values', () => {
      // Create cache with 5 second TTL
      const longCache = new Cache<string>(5000);
      longCache.set('key1', 'value1');

      // After 3 seconds, value should still be there
      vi.advanceTimersByTime(3000);
      expect(longCache.get('key1')).toBe('value1');

      // After 5+ seconds total, value should be gone
      vi.advanceTimersByTime(2001);
      expect(longCache.get('key1')).toBeUndefined();
    });
  });

  describe('delete', () => {
    it('should delete a specific key', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      cache.delete('key1');

      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBe('value2');
    });

    it('should not throw when deleting non-existent key', () => {
      expect(() => cache.delete('nonexistent')).not.toThrow();
    });
  });

  describe('clear', () => {
    it('should remove all entries from cache', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      cache.clear();

      expect(cache.size()).toBe(0);
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBeUndefined();
      expect(cache.get('key3')).toBeUndefined();
    });

    it('should not throw when clearing empty cache', () => {
      expect(() => cache.clear()).not.toThrow();
    });
  });

  describe('size', () => {
    it('should return 0 for empty cache', () => {
      expect(cache.size()).toBe(0);
    });

    it('should return correct count of entries', () => {
      cache.set('key1', 'value1');
      expect(cache.size()).toBe(1);

      cache.set('key2', 'value2');
      expect(cache.size()).toBe(2);

      cache.set('key3', 'value3');
      expect(cache.size()).toBe(3);
    });

    it('should not increase size when overwriting', () => {
      cache.set('key1', 'value1');
      cache.set('key1', 'updated');

      expect(cache.size()).toBe(1);
    });
  });

  describe('cleanExpired', () => {
    it('should remove all expired entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      // Advance time past TTL
      vi.advanceTimersByTime(1001);

      // Add a fresh entry
      cache.set('key3', 'value3');

      expect(cache.size()).toBe(3);

      cache.cleanExpired();

      expect(cache.size()).toBe(1);
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBeUndefined();
      expect(cache.get('key3')).toBe('value3');
    });

    it('should not remove non-expired entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      // Advance time but not past TTL
      vi.advanceTimersByTime(500);

      cache.cleanExpired();

      expect(cache.size()).toBe(2);
      expect(cache.get('key1')).toBe('value1');
      expect(cache.get('key2')).toBe('value2');
    });

    it('should handle empty cache', () => {
      expect(() => cache.cleanExpired()).not.toThrow();
      expect(cache.size()).toBe(0);
    });
  });

  describe('createKey', () => {
    it('should join parts with colon separator', () => {
      expect(Cache.createKey(['user', '123', 'profile'])).toBe('user:123:profile');
    });

    it('should handle single part', () => {
      expect(Cache.createKey(['single'])).toBe('single');
    });

    it('should handle empty array', () => {
      expect(Cache.createKey([])).toBe('');
    });

    it('should handle parts with special characters', () => {
      expect(Cache.createKey(['api', 'v2', 'products/123'])).toBe('api:v2:products/123');
    });
  });

  describe('with complex types', () => {
    it('should store and retrieve objects', () => {
      const objectCache = new Cache<{ id: number; name: string }>(1000);
      const obj = { id: 1, name: 'test' };

      objectCache.set('obj1', obj);

      expect(objectCache.get('obj1')).toEqual({ id: 1, name: 'test' });
    });

    it('should store and retrieve arrays', () => {
      const arrayCache = new Cache<number[]>(1000);
      const arr = [1, 2, 3, 4, 5];

      arrayCache.set('arr1', arr);

      expect(arrayCache.get('arr1')).toEqual([1, 2, 3, 4, 5]);
    });
  });
});
