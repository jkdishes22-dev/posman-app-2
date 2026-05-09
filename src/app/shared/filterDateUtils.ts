import { formatInTimeZone } from "date-fns-tz";
import { EAT_TIMEZONE } from "./eatDate";

/** Parse yyyy-MM-dd as a calendar date anchored in East Africa Time (+03:00, no DST). */
export function ymdToDateEat(ymd: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return null;
  return new Date(`${m[1]}-${m[2]}-${m[3]}T12:00:00+03:00`);
}

/** Format a picked instant as yyyy-MM-dd in East Africa Time (matches APIs / todayEAT()). */
export function dateToYmdEat(d: Date): string {
  return formatInTimeZone(d, EAT_TIMEZONE, "yyyy-MM-dd");
}
