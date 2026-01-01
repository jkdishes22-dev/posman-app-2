/**
 * Request cache utility to prevent duplicate API calls
 * Caches in-flight requests and reuses them for concurrent calls
 */

interface CachedRequest<T> {
    promise: Promise<T>;
    timestamp: number;
}

class RequestCache {
    private cache: Map<string, CachedRequest<any>> = new Map();
    private readonly TTL = 1000; // 1 second - prevent duplicate calls within 1 second

    /**
     * Get or create a cached request
     * If a request with the same key is in progress, return the existing promise
     */
    getOrCreate<T>(
        key: string,
        requestFn: () => Promise<T>
    ): Promise<T> {
        const cached = this.cache.get(key);
        const now = Date.now();

        // If cached request exists and is recent, reuse it
        if (cached && (now - cached.timestamp) < this.TTL) {
            return cached.promise;
        }

        // Create new request
        const promise = requestFn().finally(() => {
            // Remove from cache after completion (with delay to allow concurrent requests)
            setTimeout(() => {
                this.cache.delete(key);
            }, this.TTL);
        });

        // Cache the promise
        this.cache.set(key, {
            promise,
            timestamp: now,
        });

        return promise;
    }

    /**
     * Clear all cached requests
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * Clear expired requests
     */
    clearExpired(): void {
        const now = Date.now();
        for (const [key, cached] of this.cache.entries()) {
            if (now - cached.timestamp >= this.TTL * 2) {
                this.cache.delete(key);
            }
        }
    }
}

export const requestCache = new RequestCache();

// Clean up expired requests periodically
if (typeof window !== "undefined") {
    setInterval(() => {
        requestCache.clearExpired();
    }, 5000); // Every 5 seconds
}

