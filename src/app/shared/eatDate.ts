import { formatInTimeZone } from "date-fns-tz";

export const EAT_TIMEZONE = "Africa/Nairobi";

/** Returns today's date string in YYYY-MM-DD format using East Africa Time (UTC+3). */
export const todayEAT = (): string =>
  formatInTimeZone(new Date(), EAT_TIMEZONE, "yyyy-MM-dd");
