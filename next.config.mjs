import { fileURLToPath } from "url";
import { dirname } from "path";
import path from "path";
import withPWA from "next-pwa";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const nextConfig = {
    eslint: {
        ignoreDuringBuilds: true,
    },
    // Enable standalone output for Electron packaging
    output: process.env.ELECTRON_BUILD === 'true' ? 'standalone' : undefined,
    webpack: (config, { dev, isServer }) => {
        config.resolve.alias["@entities"] = path.resolve(__dirname, "src/backend/entities");
        config.resolve.alias["@services"] = path.resolve(__dirname, "src/backend/service");
        config.resolve.alias["@backend"] = path.resolve(__dirname, "src/backend");
        return config;
    }
};

export default withPWA({
    dest: "public",
    register: true,
    skipWaiting: true,
    disable: process.env.NODE_ENV === "development", // Disable in dev for easier debugging
    sw: "sw.js",
    buildExcludes: [/middleware-manifest\.json$/],
    // Precaching: Cache critical resources on install
    publicExcludes: ["!noprecache/**/*"],

    runtimeCaching: [
        // 1. Static Assets - Cache First (JS, CSS, fonts)
        // These rarely change and should be served from cache immediately
        {
            urlPattern: /\.(?:js|css|woff|woff2|ttf|otf|eot)$/,
            handler: "CacheFirst",
            options: {
                cacheName: "static-assets-v1",
                expiration: {
                    maxEntries: 100,
                    maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
                },
                cacheableResponse: {
                    statuses: [0, 200],
                },
            },
        },

        // 2. Images - Cache First with long expiration
        // Images are large and don't change often
        {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
            handler: "CacheFirst",
            options: {
                cacheName: "images-v1",
                expiration: {
                    maxEntries: 100,
                    maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
                },
                cacheableResponse: {
                    statuses: [0, 200],
                },
            },
        },

        // 3. Next.js Static Files - Cache First
        {
            urlPattern: /^https?:\/\/.*\/_next\/static\/.*/i,
            handler: "CacheFirst",
            options: {
                cacheName: "nextjs-static-v1",
                expiration: {
                    maxEntries: 200,
                    maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year (Next.js handles versioning)
                },
            },
        },

        // 4. Next.js Data - Stale While Revalidate
        // Pages and API routes that benefit from fast initial load but need updates
        {
            urlPattern: /^https?:\/\/.*\/_next\/data\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
                cacheName: "nextjs-data-v1",
                expiration: {
                    maxEntries: 50,
                    maxAgeSeconds: 24 * 60 * 60, // 24 hours
                },
            },
        },

        // 5. Semi-Static API Data - Network First with timeout
        // Menu items, categories, pricelists, stations - change infrequently
        // This strategy tries network first, falls back to cache if slow
        {
            urlPattern: /^https?:\/\/.*\/api\/menu\/(?:categories|items|pricelists).*/i,
            handler: "NetworkFirst",
            options: {
                cacheName: "menu-data-v1",
                expiration: {
                    maxEntries: 100,
                    maxAgeSeconds: 60 * 60, // 1 hour
                },
                networkTimeoutSeconds: 3, // Fallback to cache if network takes > 3s
            },
        },

        // 6. Station and Pricelist APIs - Network First with timeout
        {
            urlPattern: /^https?:\/\/.*\/api\/(?:stations|pricelists|station).*/i,
            handler: "NetworkFirst",
            options: {
                cacheName: "station-data-v1",
                expiration: {
                    maxEntries: 50,
                    maxAgeSeconds: 60 * 60, // 1 hour
                },
                networkTimeoutSeconds: 3,
            },
        },

        // 7. User Profile Data - Network First with timeout
        {
            urlPattern: /^https?:\/\/.*\/api\/users\/me.*/i,
            handler: "NetworkFirst",
            options: {
                cacheName: "user-data-v1",
                expiration: {
                    maxEntries: 10,
                    maxAgeSeconds: 5 * 60, // 5 minutes
                },
                networkTimeoutSeconds: 2,
            },
        },

        // 8. Dynamic API Data - Network First with short timeout
        // Bills, payments, inventory - need fresh data but should work offline
        {
            urlPattern: /^https?:\/\/.*\/api\/bills.*/i,
            handler: "NetworkFirst",
            options: {
                cacheName: "bills-data-v1",
                expiration: {
                    maxEntries: 50,
                    maxAgeSeconds: 5 * 60, // 5 minutes
                },
                networkTimeoutSeconds: 3, // Fallback to cache if network slow
            },
        },

        // 9. Inventory and Production - Network First
        {
            urlPattern: /^https?:\/\/.*\/api\/(?:inventory|production).*/i,
            handler: "NetworkFirst",
            options: {
                cacheName: "inventory-data-v1",
                expiration: {
                    maxEntries: 100,
                    maxAgeSeconds: 2 * 60, // 2 minutes
                },
                networkTimeoutSeconds: 3,
            },
        },

        // 10. Payments - Network First (critical, needs to be fresh)
        {
            urlPattern: /^https?:\/\/.*\/api\/payments.*/i,
            handler: "NetworkFirst",
            options: {
                cacheName: "payments-data-v1",
                expiration: {
                    maxEntries: 20,
                    maxAgeSeconds: 1 * 60, // 1 minute
                },
                networkTimeoutSeconds: 5,
            },
        },

        // 11. Auth endpoints - Network Only (never cache)
        {
            urlPattern: /^https?:\/\/.*\/api\/auth.*/i,
            handler: "NetworkOnly",
            options: {
                cacheName: "auth-v1",
            },
        },

        // 12. All other API calls - Network First with fallback
        {
            urlPattern: /^https?:\/\/.*\/api\/.*/i,
            handler: "NetworkFirst",
            options: {
                cacheName: "api-fallback-v1",
                expiration: {
                    maxEntries: 50,
                    maxAgeSeconds: 10 * 60, // 10 minutes
                },
                networkTimeoutSeconds: 5,
            },
        },

        // 13. HTML Pages - Network First with fallback
        {
            urlPattern: /^https?:\/\/.*\/.*/i,
            handler: "NetworkFirst",
            options: {
                cacheName: "pages-v1",
                expiration: {
                    maxEntries: 50,
                    maxAgeSeconds: 24 * 60 * 60, // 24 hours
                },
                networkTimeoutSeconds: 3,
            },
        },
    ],
})(nextConfig);
