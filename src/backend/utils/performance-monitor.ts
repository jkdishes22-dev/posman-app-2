// Simple performance monitoring utility
export const performanceMonitor = {
    startTime: 0,

    start() {
        this.startTime = Date.now();
    },

    end(apiName: string) {
        const duration = Date.now() - this.startTime;
        if (duration > 1000) {
            console.warn(`⚠️  Slow API: ${apiName} took ${duration}ms`);
        } else if (duration > 500) {
            console.log(`🐌  Moderate API: ${apiName} took ${duration}ms`);
        } else {
            console.log(`✅ Fast API: ${apiName} took ${duration}ms`);
        }
        return duration;
    }
};

// Middleware to monitor API performance
export const performanceMiddleware = (apiName: string) => {
    return (handler: any) => {
        return async (req: any, res: any) => {
            performanceMonitor.start();

            // Override res.json to capture response time
            const originalJson = res.json;
            res.json = function (data: any) {
                performanceMonitor.end(apiName);
                return originalJson.call(this, data);
            };

            return handler(req, res);
        };
    };
};
