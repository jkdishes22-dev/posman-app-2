/**
 * Offline Utilities
 * Helper functions for managing offline operations and service worker communication
 */

/**
 * Register background sync for offline operations
 */
export async function registerBackgroundSync(tag: string): Promise<boolean> {
    if ("serviceWorker" in navigator && "sync" in (self as any).registration) {
        try {
            const registration = await navigator.serviceWorker.ready;
            await (registration as any).sync.register(tag);
            return true;
        } catch (error) {
            console.error("Background sync registration failed:", error);
            return false;
        }
    }
    return false;
}

/**
 * Clear all caches (useful for debugging or forced refresh)
 */
export async function clearAllCaches(): Promise<boolean> {
    if ("serviceWorker" in navigator) {
        try {
            const registration = await navigator.serviceWorker.ready;
            const messageChannel = new MessageChannel();

            return new Promise((resolve) => {
                messageChannel.port1.onmessage = (event) => {
                    resolve(event.data.success);
                };

                registration.active?.postMessage(
                    { type: "CLEAR_CACHE" },
                    [messageChannel.port2]
                );
            });
        } catch (error) {
            console.error("Cache clear failed:", error);
            return false;
        }
    }
    return false;
}

/**
 * Get cache sizes for monitoring
 */
export async function getCacheSizes(): Promise<Array<{ name: string; size: number }>> {
    if ("serviceWorker" in navigator) {
        try {
            const registration = await navigator.serviceWorker.ready;
            const messageChannel = new MessageChannel();

            return new Promise((resolve) => {
                messageChannel.port1.onmessage = (event) => {
                    resolve(event.data.sizes || []);
                };

                registration.active?.postMessage(
                    { type: "GET_CACHE_SIZE" },
                    [messageChannel.port2]
                );
            });
        } catch (error) {
            console.error("Get cache size failed:", error);
            return [];
        }
    }
    return [];
}

/**
 * Check if service worker is available and active
 */
export async function isServiceWorkerReady(): Promise<boolean> {
    if ("serviceWorker" in navigator) {
        try {
            const registration = await navigator.serviceWorker.ready;
            return registration.active !== null;
        } catch (error) {
            return false;
        }
    }
    return false;
}

/**
 * Force service worker update
 */
export async function forceServiceWorkerUpdate(): Promise<boolean> {
    if ("serviceWorker" in navigator) {
        try {
            const registration = await navigator.serviceWorker.ready;
            await registration.update();
            return true;
        } catch (error) {
            console.error("Service worker update failed:", error);
            return false;
        }
    }
    return false;
}

/**
 * Queue a request for background sync when offline
 */
export async function queueRequestForSync(
    url: string,
    options: RequestInit
): Promise<void> {
    if (!navigator.onLine) {
        // Store in localStorage as fallback (IndexedDB is handled by SW)
        const queueKey = "offline-request-queue";
        const queue = JSON.parse(localStorage.getItem(queueKey) || "[]");
        queue.push({
            url,
            method: options.method || "GET",
            headers: options.headers,
            body: options.body,
            timestamp: Date.now(),
        });
        localStorage.setItem(queueKey, JSON.stringify(queue));

        // Register background sync
        await registerBackgroundSync("sync-requests");
    }
}

/**
 * Check if app is online
 */
export function isOnline(): boolean {
    return navigator.onLine;
}

/**
 * Listen for online/offline events
 */
export function onOnlineStatusChange(
    onOnline: () => void,
    onOffline: () => void
): () => void {
    const handleOnline = () => {
        onOnline();
    };

    const handleOffline = () => {
        onOffline();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Return cleanup function
    return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
    };
}

/**
 * Get estimated cache size in MB
 */
export async function getEstimatedCacheSize(): Promise<number> {
    if ("storage" in navigator && "estimate" in navigator.storage) {
        try {
            const estimate = await navigator.storage.estimate();
            return (estimate.usage || 0) / (1024 * 1024); // Convert to MB
        } catch (error) {
            console.error("Failed to estimate storage:", error);
            return 0;
        }
    }
    return 0;
}

/**
 * Request persistent storage (for better cache retention)
 */
export async function requestPersistentStorage(): Promise<boolean> {
    if ("storage" in navigator && "persist" in navigator.storage) {
        try {
            const isPersistent = await navigator.storage.persist();
            return isPersistent;
        } catch (error) {
            console.error("Failed to request persistent storage:", error);
            return false;
        }
    }
    return false;
}

