import { startOfDay, endOfDay } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { getAppTimezone } from "../config/timezone";

/**
 * Parses a YYYY-MM-DD query string into a UTC Date that represents the START
 * of that day in the application's configured timezone (Africa/Nairobi by
 * default). Returns undefined for invalid input.
 *
 * Use this for filter "from" inputs so a user picking "today" gets bills
 * created from 00:00:00 local that day onward.
 */
export const parseStartDateInAppTz = (val: string | string[] | undefined): Date | undefined => {
    const str = pickFirst(val);
    if (!str || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return undefined;
    const tz = getAppTimezone();
    const naive = new Date(`${str}T12:00:00`);
    if (isNaN(naive.getTime())) return undefined;
    const local = toZonedTime(naive, tz);
    return fromZonedTime(startOfDay(local), tz);
};

/**
 * Parses a YYYY-MM-DD query string into a UTC Date that represents the END
 * (23:59:59.999) of that day in the application's configured timezone.
 * Returns undefined for invalid input.
 *
 * Use this for filter "to" inputs so a user picking "today" gets bills
 * created up to 23:59 local that day inclusive.
 */
export const parseEndDateInAppTz = (val: string | string[] | undefined): Date | undefined => {
    const str = pickFirst(val);
    if (!str || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return undefined;
    const tz = getAppTimezone();
    const naive = new Date(`${str}T12:00:00`);
    if (isNaN(naive.getTime())) return undefined;
    const local = toZonedTime(naive, tz);
    return fromZonedTime(endOfDay(local), tz);
};

const pickFirst = (val: string | string[] | undefined): string | undefined => {
    if (val == null) return undefined;
    return Array.isArray(val) ? val[0] : val;
};
