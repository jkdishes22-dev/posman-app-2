import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import withPWA from 'next-pwa'

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const nextConfig = {
    webpack: (config) => {
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
        }
    ]
})(nextConfig);
