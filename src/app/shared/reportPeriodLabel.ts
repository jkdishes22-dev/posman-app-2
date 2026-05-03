/**
 * Display string for report `date` fields: calendar day uses locale date;
 * week/month/year bucket keys (e.g. 2026-W03, 2026-01, 2026) pass through.
 */
export function formatReportPeriodLabel(bucket: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(bucket)) {
    const d = new Date(`${bucket}T12:00:00`);
    return Number.isNaN(d.getTime()) ? bucket : d.toLocaleDateString();
  }
  return bucket;
}
