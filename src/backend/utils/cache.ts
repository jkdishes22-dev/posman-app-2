/**
 * Simple in-memory cache utility for services
 * Provides TTL-based caching with automatic expiration
 */

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    ttl: number;
}

class SimpleCache {
    private cache: Map<string, CacheEntry<any>> = new Map();
    private readonly defaultTTL = 300000; // 5 minutes default TTL

    /**
     * Get cached value by key
     * Returns null if not found or expired
     */
    get<T>(key: string): T | null {
        const entry = this.cache.get(key);
        if (!entry) {
            return null;
        }

        // Check if cache entry has expired using its stored TTL
        if (Date.now() - entry.timestamp > entry.ttl) {
            this.cache.delete(key);
            return null;
        }

        return entry.data as T;
    }

    /**
     * Set cached value with optional TTL (milliseconds)
     */
    set<T>(key: string, data: T, ttl?: number): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl: ttl ?? this.defaultTTL,
        });
    }

    /**
     * Clear all cache entries
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * Invalidate cache entries matching a pattern
     */
    invalidate(pattern: string): void {
        for (const key of this.cache.keys()) {
            if (key.includes(pattern)) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Invalidate cache entries matching any of the given patterns in a single Map scan.
     * Prefer this over multiple sequential invalidate() calls.
     */
    invalidateMany(patterns: string[]): void {
        for (const key of this.cache.keys()) {
            if (patterns.some(p => key.includes(p))) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Remove specific cache entry
     */
    delete(key: string): void {
        this.cache.delete(key);
    }
}

// Export singleton instance for use across services
export const cache = new SimpleCache();

