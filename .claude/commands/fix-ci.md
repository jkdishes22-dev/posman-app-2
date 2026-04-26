# Fix CI — Investigate & Repair GitHub Actions Failures

Investigate every non-security GitHub Actions workflow in `.github/workflows/`, reproduce each failure locally, fix the root cause, then verify the fix. Never touch the `security` job in `ci.yml` or any step with `continue-on-error: true` that is explicitly marked as a security audit.

---

## Environments covered by CI

| Workflow file | Target environment | Key checks |
|---|---|---|
| `ci.yml` (job: test) | Ubuntu / Node 18 & 20 | tsc, lint, build |
| `deploy-vercel.yml` | Vercel (production) | tsc, lint, build, deploy |
| `deploy-preview.yml` | Vercel (preview) | tsc, lint, build, deploy |
| `build-windows.yml` | Windows x64 + ia32 installer | build (ELECTRON_BUILD=true), electron-builder |
| `build-windows-x64.yml` | Windows x64 installer (on push to main) | build (ELECTRON_BUILD=true), electron-builder |

---

## Step 0 — Read every non-security workflow

Read all files in `.github/workflows/`:

```
.github/workflows/ci.yml
.github/workflows/deploy-vercel.yml
.github/workflows/deploy-preview.yml
.github/workflows/build-windows.yml
.github/workflows/build-windows-x64.yml
.github/workflows/database-migration.yml
.github/workflows/health-check.yml
.github/workflows/cleanup.yml
.github/workflows/rollback.yml
```

For each workflow, extract:
- All `run:` steps that are NOT under a job named `security` and NOT marked `continue-on-error: true` with a security-audit comment
- Required `env:` variables (note which are GitHub secrets vs build constants)
- The `runs-on:` OS for each job

Build a checklist of every command that must pass. Skip only:
- `npm audit` / `npx audit-ci` steps
- Any step inside a job explicitly named `security`
- Steps that use `actions/upload-artifact`, `actions/download-artifact`, `softprops/action-gh-release`, `amondnet/vercel-action` (these require GitHub/Vercel credentials — cannot run locally)

---

## Step 1 — Run TypeScript type check

```bash
npm run tsc
```

Capture output. If it fails:
- Read each file mentioned in the error output
- Fix type errors: add missing types, correct mismatched types, add type assertions where the type system is too strict but the logic is correct
- Do NOT suppress errors with `@ts-ignore` unless the error is caused by a known Next.js 15 issue with `.js` imports for `.tsx` files (which is already handled by `ignoreBuildErrors: true` in `next.config.mjs`)
- Re-run `npm run tsc` after fixes

---

## Step 2 — Run ESLint

```bash
npm run lint
```

Capture output. If it fails:
- Read the files with lint errors
- Fix each lint error according to its rule
- If a rule is genuinely inapplicable (e.g., a false positive), add an inline `// eslint-disable-next-line <rule>` with a comment explaining why — do not blanket-disable rules in `.eslintrc`
- Re-run `npm run lint` after fixes

---

## Step 3 — Verify Next.js web build (Vercel environments)

The CI/Vercel workflows build with:

```bash
NODE_ENV=production npm run build
```

Required secrets (from `ci.yml`, `deploy-vercel.yml`, `deploy-preview.yml`):
- `DATABASE_URL` — MySQL connection string
- `JWT_SECRET`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USERNAME`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`

**Check for a local `.env` or `.env.local`:**
- If present, run: `npm run build`
- If not present, check whether the build can proceed without DB connectivity (Next.js builds the app statically; DB is only needed at runtime for API routes). Try running:
  ```bash
  DATABASE_URL="mysql://localhost/build_check" JWT_SECRET="build-check" NEXTAUTH_SECRET="build-check" NEXTAUTH_URL="http://localhost:3000" npm run build
  ```
- If the build fails due to missing env vars at build time (not runtime), read `next.config.mjs` and any `src/backend/config/` files to identify which vars are evaluated at build time, then provide stub values only for those

If the build fails for any other reason:
- Read the error output carefully
- Identify the file and line causing the failure
- Fix the root cause
- Re-run the build

After a successful build, confirm `.next/` exists.

---

## Step 4 — Verify Electron / Windows installer build readiness

The Windows workflows build with:

```bash
ELECTRON_BUILD=true NODE_ENV=production JWT_SECRET="build-token" npm run build
```

Key difference from web build: `ELECTRON_BUILD=true` causes `next.config.mjs` to set `output: 'standalone'`, which generates `.next/standalone/server.js`.

**Check:**
1. Run the build with `ELECTRON_BUILD=true`:
   ```bash
   ELECTRON_BUILD=true NODE_ENV=production JWT_SECRET="build-token" DATABASE_URL="mysql://localhost/build_check" NEXTAUTH_SECRET="build-check" NEXTAUTH_URL="http://localhost:3000" npm run build
   ```
2. Verify `.next/standalone/server.js` exists after the build
3. Verify `electron/main.cjs` exists (it is the Electron entry point per `package.json`)
4. Read `scripts/afterPackHook.js` — confirm it correctly copies `.next/standalone` into the unpacked app directory
5. Check `electron-builder.config.js` (or the inline config in `package.json`) for `extraFiles`/`extraResources` pointing to `.next/standalone` — if missing or misconfigured, flag it

**Do NOT run `electron-builder` locally** — it requires Windows for `.exe` output. Verify configuration only.

---

## Step 5 — Check database migration workflow readiness

Read `.github/workflows/database-migration.yml`. Identify:
- Which migration commands it runs (`npm run migration:run`, etc.)
- Whether migration files exist in `src/backend/migrations/` (or wherever TypeORM is configured to look)
- Read `src/backend/config/data-source.ts` to confirm the `migrations` path is correct

Flag any discrepancy but do not run migrations (they require a live DB).

---

## Step 6 — Summarise all findings and fixes applied

Output a table:

| Check | Status | Issue found | Fix applied |
|---|---|---|---|
| TypeScript (`npm run tsc`) | PASS / FAIL | ... | ... |
| ESLint (`npm run lint`) | PASS / FAIL | ... | ... |
| Next.js build (web) | PASS / FAIL | ... | ... |
| Electron build (standalone) | PASS / FAIL | ... | ... |
| `.next/standalone/server.js` present | YES / NO | ... | ... |
| `afterPackHook.js` correct | YES / NO | ... | ... |
| Migration config valid | YES / NO | ... | ... |

If a failure cannot be fixed without GitHub secrets (e.g., a secret not available in `.env`), report it clearly and suggest what value to add to the repo's GitHub Actions secrets.

---

## Step 7 — Commit and open a PR (only if files were changed)

If no files were modified in Steps 1–5, skip this step entirely and state that no changes were needed.

If any files were modified, stage and commit them, then open a PR targeting `main`.

### 7a — Create a branch

```bash
git fetch origin main
git checkout main
git pull origin main
git checkout -b fix/ci-$(date +%Y%m%d)
```

If the branch already exists, append a counter (e.g. `-2`).

### 7b — Stage only the files that were changed

Never use `git add -A` or `git add .`. Stage each modified file explicitly by name:

```bash
git add <file1> <file2> ...
```

### 7c — Commit

```bash
git commit -m "$(cat <<'EOF'
fix: resolve CI failures detected by /fix-ci

- <one line per fix applied, e.g. "remove unused type-only stubs from pages/api/">
- <next fix>

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

### 7d — Push and open the PR

```bash
git push -u origin HEAD
```

Then create the PR with `gh`:

```bash
gh pr create \
  --base main \
  --title "fix: resolve CI failures (tsc / lint / build)" \
  --body "$(cat <<'EOF'
## Summary
<bullet list of every fix applied from Steps 1–5>

## CI checks verified locally
- [x] `npm run tsc` — passes
- [x] `npm run lint` — passes
- [x] `npm run build` (web / Vercel) — passes
- [x] `ELECTRON_BUILD=true npm run build` (standalone) — passes
- [x] `.next/standalone/server.js` present
- [x] `afterPackHook.js` configuration verified
- [x] Migration config (`data-source.ts`) verified

## Files changed
| File | Change |
|------|--------|
| ... | ... |

## Secrets required in GitHub Actions (not changed by this PR)
List any env vars that must be set in GitHub repo secrets for CI to pass end-to-end.
If none, write "None".

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Return the PR URL to the user.

---

## What NOT to fix

- `npm audit` vulnerabilities — these are `continue-on-error: true` and explicitly out of scope
- Vercel deployment failures — require `VERCEL_TOKEN`/`VERCEL_ORG_ID`/`VERCEL_PROJECT_ID`
- Windows installer signing (`CSC_IDENTITY_AUTO_DISCOVERY`) — requires a code-signing certificate
- GitHub Release creation — requires `GITHUB_TOKEN` with release permissions
- Any job named `security` in any workflow file
