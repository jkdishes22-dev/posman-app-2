import { fileURLToPath } from "url";
import { dirname } from "path";
import path from "path";
import withPWA from "next-pwa";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const nextConfig = {
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
    disable: false,
    sw: "sw.js",
    runtimeCaching: [
        {
            urlPattern: /^https?.*/,
            handler: "NetworkFirst",
            options: {
                cacheName: "offlineCache",
                expiration: {
                    maxEntries: 200
                }
            }
        }
    ]
})(nextConfig);
