/**
 * Next.js Node server lifecycle hook — runs once when the server process starts
 * (dev, standalone/Electron, or `next start`). Edge runtime is skipped.
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }
  const { applyPendingMigrationsAtStartup } = await import("@backend/config/startup-bootstrap");
  await applyPendingMigrationsAtStartup();
}
