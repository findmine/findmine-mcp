/**
 * Simple in-memory cache for API responses
 */

interface CacheEntry<T> {
  value: T;
  expiry: number;
}

export class Cache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private ttlMs: number;

  constructor(ttlMs: number) {
    this.ttlMs = ttlMs;
  }

  /**
   * Set a value in the cache
   */
  set(key: string, value: T): void {
    const expiry = Date.now() + this.ttlMs;
    this.cache.set(key, { value, expiry });
  }

  /**
   * Get a value from the cache
   * Returns undefined if the key doesn't exist or has expired
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    // Check if the entry has expired
    if (entry.expiry < Date.now()) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  /**
   * Remove a value from the cache
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all values from the cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get the size of the cache
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Clean expired entries from the cache
   */
  cleanExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiry < now) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Create a cache key from parameters
   */
  static createKey(parts: string[]): string {
    return parts.join(':');
  }
}
