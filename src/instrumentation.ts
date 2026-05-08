/**
 * Next.js Node server lifecycle hook — runs once when the server process starts
 * (dev, standalone/Electron, or `next start`). Edge runtime is skipped.
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export const runtime = "nodejs";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }
  // Keep dev startup lean and avoid bundling server-only DB modules in instrumentation.
  if (process.env.ENABLE_STARTUP_MIGRATIONS_HOOK !== "1") {
    return;
  }
  const dynamicImport = new Function("p", "return import(p)") as (p: string) => Promise<any>;
  const { applyPendingMigrationsAtStartup } = await dynamicImport("@backend/config/startup-bootstrap");
  await applyPendingMigrationsAtStartup();
}
