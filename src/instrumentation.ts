/**
 * Next.js Node server lifecycle hook — runs once when the server process starts
 * (dev, standalone/Electron, or `next start`). Edge runtime is skipped.
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export const runtime = "nodejs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { closeConnection } = await import("@backend/config/data-source");

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    (process as NodeJS.Process).once("SIGINT", async () => {
      await closeConnection();
      process.exit(0);
    });
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    (process as NodeJS.Process).once("SIGTERM", async () => {
      await closeConnection();
      process.exit(0);
    });

    // Keep dev startup lean and avoid bundling server-only DB modules in instrumentation.
    if (process.env.ENABLE_STARTUP_MIGRATIONS_HOOK === "1") {
      const { applyPendingMigrationsAtStartup } = await import("@backend/config/startup-bootstrap");
      await applyPendingMigrationsAtStartup();
    }
  }
}
