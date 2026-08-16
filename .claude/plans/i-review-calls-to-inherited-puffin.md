# Fix: Windows 7 crash caused by static licenseService import (PR #129 regression)

## Context

PR #129 moved `licenseService` from a dynamic import inside `checkStatusInternal()` to a top-level static import in `startup-bootstrap.ts`. This broke the Windows 7 build (Electron 22 / Node 16.17.1).

**Why it crashes:** `dbMiddleware.ts` has a **static** import of `startup-bootstrap`:
```ts
import { formatSetupErrorResponse } from "@backend/config/startup-bootstrap";
```
With our change, loading `startup-bootstrap` now also loads `LicenseService` statically. Since `dbMiddleware` is pulled in at API route initialization time (before any request), `LicenseService` is now loaded synchronously during server startup — not lazily. On Windows 7 / Node 16.17.1 this causes the bundled `server.js` to crash with exit code 1 within 1 second.

The `ReferenceError: logFile is not defined` in the logs is a bundler-generated variable name in the compiled server.js that becomes undefined when module initialization fails — a side-effect of the crash, not an independent bug.

**What is NOT broken:** The two other changes in PR #129 are safe and must be kept:
- Early return in `checkSqliteStatus()` when `migrationsAppliedThisProcess` is true
- The `checkSqliteStatus()` migration/integrity short-circuit

**Constraint:** Fix must not affect Windows 10 / 11 behavior.

---

## File to Modify

**`src/backend/config/startup-bootstrap.ts`**

---

## Change

Revert only the `licenseService` import — restore it to a dynamic import inside `checkStatusInternal()`.

### Remove the top-level import (line 4)
```ts
// DELETE this line:
import { licenseService } from "@backend/licensing/LicenseService";
```

### Restore dynamic import inside `checkStatusInternal()`
```ts
async function checkStatusInternal(): Promise<SetupStatusPayload> {
  const { licenseService } = await import("@backend/licensing/LicenseService");
  if (isSqliteMode()) {
    // ... rest unchanged
```

This restores the original behaviour: `LicenseService` is only loaded when the setup-status API is first called, not at server module initialization time. Node.js caches the module after the first dynamic import, so subsequent calls within the same process are free — the performance concern that motivated the static import was not real.

---

## Why the other two optimizations are safe to keep

- `checkSqliteStatus()` early return — only touches `AppDataSource` and `migrationsAppliedThisProcess`, no LicenseService dependency
- The `shouldRunIntegrityCheck` skip — same, no LicenseService dependency

---

## Verification

1. `npm run tsc` — no type errors
2. `npm run test:unit` — 257/257 pass
3. Trigger the Windows 7 workflow manually with a test version label; confirm server starts and reaches `{ state: "ready" }` without exit code 1
4. Confirm Windows 10/11 build is unaffected (normal CI workflow passes)