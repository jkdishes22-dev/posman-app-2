/**
 * Timezone configuration for the application
 */

/**
 * Get the application timezone
 * Uses local timezone by default, but can be overridden with environment variable
 */
export const getAppTimezone = (): string => {
    // Check if timezone is set in environment variables
    if (process.env.APP_TIMEZONE) {
        return process.env.APP_TIMEZONE;
    }

    // Use local timezone as fallback
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

/**
 * Default timezone constant for backward compatibility
 */
export const APP_TIMEZONE = getAppTimezone();
