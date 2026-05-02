/**
 * Timezone configuration for the application.
 * Posman is designed for Kenya (EAT = UTC+3). APP_TIMEZONE env var can override
 * this for testing purposes only.
 */
export const getAppTimezone = (): string =>
    process.env.APP_TIMEZONE ?? "Africa/Nairobi";

export const APP_TIMEZONE = getAppTimezone();
