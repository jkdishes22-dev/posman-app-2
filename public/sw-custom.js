/**
 * Custom Service Worker Enhancements
 * Extends the base Workbox service worker with additional features:
 * - Background sync for offline operations
 * - Cache cleanup and management
 * - Update notifications
 * - Performance monitoring
 */

// Import Workbox (will be available at runtime)
importScripts("https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js");

// Set Workbox debug mode in development
if (self.location.hostname === "localhost" || self.location.hostname === "127.0.0.1") {
    workbox.setConfig({ debug: true });
}

// Cache version for cache invalidation
const CACHE_VERSION = "v1";
const CACHE_PREFIX = "posman";

// Background Sync for offline operations
// This allows queuing API requests when offline and syncing when back online
if ("sync" in self.registration) {
    self.addEventListener("sync", (event) => {
        if (event.tag === "sync-bills") {
            event.waitUntil(syncBills());
        } else if (event.tag === "sync-payments") {
            event.waitUntil(syncPayments());
        }
    });
}

// Queue for failed requests
const requestQueue = [];

// Store failed requests for background sync
async function queueRequest(request) {
    const clonedRequest = request.clone();
    const requestData = {
        url: request.url,
        method: request.method,
        headers: Object.fromEntries(request.headers.entries()),
        body: await clonedRequest.text(),
        timestamp: Date.now(),
    };

    // Store in IndexedDB for persistence
    try {
        const db = await openDB();
        await db.put("failedRequests", requestData);
    } catch (error) {
        console.error("Failed to queue request:", error);
    }
}

// Sync queued requests when back online
async function syncQueuedRequests() {
    try {
        const db = await openDB();
        const requests = await db.getAll("failedRequests");

        for (const requestData of requests) {
            try {
                const response = await fetch(requestData.url, {
                    method: requestData.method,
                    headers: requestData.headers,
                    body: requestData.body,
                });

                if (response.ok) {
                    // Remove from queue on success
                    await db.delete("failedRequests", requestData.url);
                }
            } catch (error) {
                console.error("Failed to sync request:", error);
            }
        }
    } catch (error) {
        console.error("Failed to sync queued requests:", error);
    }
}

// IndexedDB helper
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("posman-offline", 1);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains("failedRequests")) {
                db.createObjectStore("failedRequests", { keyPath: "url" });
            }
        };
    });
}

// Cache cleanup on activation
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((cacheName) => {
                        // Delete old caches that don't match current version
                        return cacheName.startsWith(CACHE_PREFIX) &&
                            !cacheName.includes(CACHE_VERSION);
                    })
                    .map((cacheName) => {
                        console.log("Deleting old cache:", cacheName);
                        return caches.delete(cacheName);
                    })
            );
        }).then(() => {
            // Claim all clients immediately
            return self.clients.claim();
        })
    );
});

// Performance monitoring - log cache hits/misses
self.addEventListener("fetch", (event) => {
    // Only monitor API requests
    if (event.request.url.includes("/api/")) {
        event.respondWith(
            (async () => {
                const cache = await caches.open("api-fallback-v1");
                const cachedResponse = await cache.match(event.request);

                if (cachedResponse) {
                    // Log cache hit
                    console.log("[SW] Cache hit:", event.request.url);
                } else {
                    // Log cache miss
                    console.log("[SW] Cache miss:", event.request.url);
                }

                // Let Workbox handle the actual caching
                return fetch(event.request);
            })()
        );
    }
});

// Message handler for cache management from client
self.addEventListener("message", (event) => {
    if (event.data && event.data.type === "SKIP_WAITING") {
        self.skipWaiting();
    }

    if (event.data && event.data.type === "CLEAR_CACHE") {
        event.waitUntil(
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => caches.delete(cacheName))
                );
            }).then(() => {
                event.ports[0].postMessage({ success: true });
            })
        );
    }

    if (event.data && event.data.type === "GET_CACHE_SIZE") {
        event.waitUntil(
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map(async (cacheName) => {
                        const cache = await caches.open(cacheName);
                        const keys = await cache.keys();
                        return { name: cacheName, size: keys.length };
                    })
                );
            }).then((sizes) => {
                event.ports[0].postMessage({ sizes });
            })
        );
    }
});

// Sync bills when back online
async function syncBills() {
    console.log("[SW] Syncing bills...");
    // Implementation would sync pending bills
    // This is a placeholder - implement based on your bill sync logic
}

// Sync payments when back online
async function syncPayments() {
    console.log("[SW] Syncing payments...");
    // Implementation would sync pending payments
    // This is a placeholder - implement based on your payment sync logic
}

// Listen for online/offline events
self.addEventListener("online", () => {
    console.log("[SW] Back online, syncing queued requests...");
    syncQueuedRequests();
});

// Periodic background sync (if supported)
if ("periodicSync" in self.registration) {
    self.addEventListener("periodic sync", (event) => {
        if (event.tag === "sync-data") {
            event.waitUntil(syncQueuedRequests());
        }
    });
}

