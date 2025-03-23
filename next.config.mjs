import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import withPWA from 'next-pwa';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const nextConfig = {
    webpack: (config, { dev, isServer }) => {
        config.resolve.alias['@entities'] = path.resolve(__dirname, 'src/backend/entities');
        config.resolve.alias['@services'] = path.resolve(__dirname, 'src/backend/service');
        return config;
    }
};

export default withPWA({
    dest: 'public',
    register: true,
    skipWaiting: true,
    runtimeCaching: [
        {
            urlPattern: /^\/api\/.*$/,
            handler: 'NetworkFirst',
            options: {
                networkTimeoutSeconds: 10,
            },
        },
        {
            urlPattern: /\/(.*)\.(?:png|jpg|jpeg|svg|gif)/,
            handler: 'CacheFirst',
            options: {
                cacheName: 'images',
                expiration: {
                    maxEntries: 60,
                    maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
                },
            },
        },
    ],
    buildExcludes: [/middleware-manifest\.json$/],
})(nextConfig);
