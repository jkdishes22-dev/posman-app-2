/**
 * Simple in-memory cache utility for services
 * Provides TTL-based caching with automatic expiration
 */

interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

class SimpleCache {
    private cache: Map<string, CacheEntry<any>> = new Map();
    private readonly defaultTTL = 30000; // 30 seconds default TTL

    /**
     * Get cached value by key
     * Returns null if not found or expired
     */
    get<T>(key: string, ttl?: number): T | null {
        const entry = this.cache.get(key);
        if (!entry) {
            return null;
        }

        const cacheTTL = ttl || this.defaultTTL;

        // Check if cache entry has expired
        if (Date.now() - entry.timestamp > cacheTTL) {
            this.cache.delete(key);
            return null;
        }

        return entry.data as T;
    }

    /**
     * Set cached value with optional TTL
     */
    set<T>(key: string, data: T, ttl?: number): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
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
     * Remove specific cache entry
     */
    delete(key: string): void {
        this.cache.delete(key);
    }
}

// Export singleton instance for use across services
export const cache = new SimpleCache();

