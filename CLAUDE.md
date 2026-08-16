# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Project rules

- Always create a new branch from origin/main when starting a new feature or change
- Always switch to plan mode when researching about an issue. Ask to be switched to edit mode manually
- Always use sqlite as the default DB mode
- Never skip pre-commit hooks
- Never introduce breaking changes, always ask when in doubt
- Prefer editing existing files over creating new ones
- Always add unit and/or e2e tests for all changes done. If a change breaks a test, do not make assumptions but rather ask
- Run `npm run tsc` before committing TypeScript changes

# Commands

```bash
# Development
npm run dev                        # Next.js web dev server
npm run electron:dev:sqlite        # Electron desktop (sqlite, port 3000)

# Type checking & lint
npm run tsc                        # TypeScript check (run before every commit)
npm run lint                       # ESLint

# Tests
npm run test:unit                  # Vitest unit tests
npm run test:e2e                   # Vitest e2e (API-level) tests
npm run test:playwright            # Playwright browser tests (seeds DB first)
npm run test                       # unit + e2e

# Run a single test file
npx vitest run --config vitest.config.unit.ts path/to/spec.ts
npx vitest run --config vitest.config.e2e.ts  path/to/spec.ts

# Migrations
npm run migration:run:sqlite       # Apply pending migrations (sqlite)
npm run migration:run              # Apply pending migrations (mysql)

# Build
npm run build                      # Next.js production build
npm run electron:build:sqlite:mac  # Electron installer for macOS (sqlite)
npm run electron:build:sqlite:win  # Electron installer for Windows (sqlite)
```

# Architecture

## Runtime modes

The app runs as **Next.js web** (vercel/server) or **Electron desktop**. The Electron main process (`electron/main.cjs`) starts a Next.js production server internally and adds IPC bridges for silent printing (`electron.printReceipt`), keytar secrets, and logging. Database mode is controlled by `DB_MODE=sqlite` (default) or `DB_MODE=mysql`.

## Request path

```
Browser → pages/api/**  (Next.js API routes, next-connect handler)
                ↓
        src/backend/controller/**Controller.ts
                ↓
        src/backend/service/**Service.ts  (TypeORM repositories)
                ↓
        SQLite (better-sqlite3) or MySQL (mysql2) via TypeORM
```

All API routes live in `pages/api/` and follow the next-connect pattern. Controllers are thin adapters that extract params and call services. Business logic lives exclusively in services.

## Frontend structure

```
src/app/
  admin/         # Admin panel (reports, items, users, settings…)
  cashier/       # Cashier-facing pages
  shared/        # Shared components & utilities used across pages
    printUtils.ts           # printReceiptWithTimestamp(), double-copy helpers
    receiptThermalLayout.ts # Fixed-width 40-char helpers (padLeft, padRight, centerTextLine…)
  components/    # Generic UI components (ErrorDisplay, PageHeaderStrip, …)
  utils/         # apiUtils (useApiCall hook), errorUtils, authUtils
```

## Thermal print pattern

Each report that supports thermal printing has a `*ThermalPrint.tsx` sibling component (e.g. `ItemsSoldCountThermalPrint.tsx`). The page:
1. Fetches printer name and org title from `/api/system/receipt-printer-prefs` on mount.
2. Aggregates report rows into print-ready data.
3. Calls `printReceiptWithTimestamp(Component, data, title, "receipt", printerName)` from `src/app/shared/printUtils.ts`.

The thermal component renders a `<pre>` block inside a 72mm `<div>` using the fixed-width helpers from `receiptThermalLayout.ts` (`THERMAL_WIDTH_80MM = 40` chars).

## Migrations

Schema changes require **two** migration files — one in `src/backend/config/migrations/` (MySQL) and one in `src/backend/config/migrations-sqlite/` — using sequential timestamps (`1700000000NNN-Name.cjs`). New role capabilities also need a migration; updating `src/backend/config/role-permissions.ts` alone is insufficient (the DB seeds on first run and won't auto-update).

## Auth & permissions

- ACL enforced in `src/backend/config/acl.ts` (middleware) and `src/backend/config/role-permissions.ts`.
- `PermissionService` resolves per-user capabilities from the DB.
- Cashier does **not** approve voids or quantity changes — those belong to Supervisor.

## Tests

- **Unit** (`vitest.config.unit.ts`): service-level, mocks TypeORM repositories.
- **E2E** (`vitest.config.e2e.ts`): hits a real SQLite test DB at `.test-db/`.
- **Playwright** (`vitest.config.playwright-seed.ts` → `playwright.config.ts`): seeds then runs full browser flows.