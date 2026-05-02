import { formatInTimeZone } from "date-fns-tz";

export const EAT_TIMEZONE = "Africa/Nairobi";

export const todayEAT = (): string =>
    formatInTimeZone(new Date(), EAT_TIMEZONE, "yyyy-MM-dd");
