import { format, getISOWeek, getISOWeekYear } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { getAppTimezone } from "../config/timezone";

export type ReportPeriod = "day" | "week" | "month" | "year";

export function parseReportPeriod(val: string | string[] | undefined): ReportPeriod | undefined {
    const s = Array.isArray(val) ? val[0] : val;
    if (s === "day" || s === "week" || s === "month" || s === "year") return s;
    return undefined;
}

/**
 * Bucket label for grouping report rows in the application timezone.
 * - day: yyyy-MM-dd
 * - week: yyyy-Www (ISO week, Monday-based)
 * - month: yyyy-MM
 * - year: yyyy
 */
export function reportPeriodBucketKey(utcDate: Date, period?: ReportPeriod): string {
    const tz = getAppTimezone();
    const z = toZonedTime(utcDate, tz);
    const p = period ?? "day";
    if (p === "week") {
        return `${getISOWeekYear(z)}-W${String(getISOWeek(z)).padStart(2, "0")}`;
    }
    if (p === "month") {
        return format(z, "yyyy-MM");
    }
    if (p === "year") {
        return format(z, "yyyy");
    }
    return format(z, "yyyy-MM-dd");
}
