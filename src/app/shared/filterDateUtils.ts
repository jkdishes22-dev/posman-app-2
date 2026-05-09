import { isValid } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { EAT_TIMEZONE, todayEAT } from "./eatDate";

/** Parse yyyy-MM-dd as a calendar date anchored in East Africa Time (+03:00, no DST). */
export function ymdToDateEat(ymd: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return null;
  const canonical = `${m[1]}-${m[2]}-${m[3]}`;
  const d = new Date(`${canonical}T12:00:00+03:00`);
  if (!isValid(d)) return null;
  if (formatInTimeZone(d, EAT_TIMEZONE, "yyyy-MM-dd") !== canonical) return null;
  return d;
}

/** Format a picked instant as yyyy-MM-dd in East Africa Time (matches APIs / todayEAT()). */
export function dateToYmdEat(d: Date): string {
  if (!isValid(d)) return todayEAT();
  return formatInTimeZone(d, EAT_TIMEZONE, "yyyy-MM-dd");
}
