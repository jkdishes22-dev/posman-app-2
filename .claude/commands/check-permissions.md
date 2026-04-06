# Permission Audit

Audit every API route in this Next.js + TypeORM project for permission correctness across all five roles (admin, supervisor, sales, cashier, storekeeper), then open a PR with findings and any fixes needed.

## Stack Context
- Framework: Next.js 15 (Pages Router), API routes in `pages/api/`
- Permission constants: `src/backend/config/permissions.ts`
- Role-permission map: `src/backend/config/role-permissions.ts`
- Migrations: `src/backend/config/migrations/0001-SeedInitialData.cjs` (canonical source)
- Auth middleware: `src/backend/middleware/auth.ts` — `authorize([permission])(handler)`

---

## Step 0 — Create a Branch from Main

```bash
git fetch origin main
git checkout main
git pull origin main
git checkout -b feat/permission-audit-$(date +%Y%m%d)
```

If the branch already exists, append `-2`. Confirm the new branch is active.

---

## Step 1 — Build the Route→Permission Map

For every file in `pages/api/**/*.ts`:
1. Read the file.
2. Extract which `permissions.CAN_*` constant(s) the `authorize([...])` call requires.
3. Note the HTTP method(s) and the logical action (e.g. "close bill", "cancel bill").

Output a table:

| Route | Method | Permission Required | Action |
|-------|--------|---------------------|--------|
| `pages/api/bills/[billId]/close.ts` | POST | `can_close_bill` | Close bill |
| ... | ... | ... | ... |

---

## Step 2 — Build the Role→Permission Matrix

Load `ROLE_PERMISSIONS` from `src/backend/config/role-permissions.ts` (including inherited roles via `ROLE_HIERARCHY`).

For each route from Step 1, check which roles can access it:

| Route | Action | admin | supervisor | sales | cashier | storekeeper |
|-------|--------|-------|-----------|-------|---------|-------------|
| close bill | POST `/bills/:id/close` | ❌ | ✅ | ❌ | ✅ | ❌ |
| ... | | | | | | |

Use `hasPermission(userRoles, permission)` logic from `role-permissions.ts`.

---

## Step 3 — Identify Gaps and Over-Permissions

Flag every row where:
- **Gap**: A role that logically *should* have access but doesn't (e.g. cashier cannot close bill)
- **Over-permission**: A role that has broader access than their job requires (e.g. `can_view_bill` allowing reopening — too permissive)
- **Wrong permission on route**: Route uses a generic permission (e.g. `can_edit_bill`) when a specific one exists (e.g. `can_close_bill`)

For each finding, classify:
- `[GAP]` — role missing a needed permission
- `[OVER]` — role has too broad a permission
- `[ROUTE]` — route uses the wrong/too-broad permission constant

---

## Step 4 — Apply Fixes

For each **[GAP]**, **[OVER]**, and **[ROUTE]** finding:

1. Read the affected file with the Read tool.
2. Apply the fix with the Edit tool.
3. If a route permission constant changes, verify the new constant exists in `permissions.ts`.
4. If a role needs a new permission, update **all three** of:
   - `src/backend/config/role-permissions.ts` → `ROLE_PERMISSIONS`
   - `src/backend/config/migrations/0001-SeedInitialData.cjs` → `rolePermissionsBaseline` + `SEEDED_PERMISSION_NAMES` + `seedPermissions` billing array
   - `src/backend/config/migrations/1700000000005-SeedPermissions.cjs` → `permissionMappings` + `allPermissions` in `down()`
   - `src/backend/config/migrations/1700000000007-AssignPermissionsToRoles.cjs` → `rolePermissions`

Do NOT:
- Add new migration files — rewrite existing ones.
- Remove permissions that are already correctly assigned.
- Touch unrelated files.

---

## Step 5 — Commit & Push

Stage only changed files (never `git add -A`):

```bash
git add <file1> <file2> ...
git commit -m "fix: resolve permission gaps across roles

- <one line per fix applied>

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
git push -u origin HEAD
```

---

## Step 6 — Open a Pull Request

```bash
gh pr create \
  --base main \
  --title "fix: resolve role permission gaps" \
  --body "$(cat <<'EOF'
## Permission Audit Results

### Route→Permission Matrix
<paste table from Step 2>

### Findings & Fixes
| Finding | Type | Fix Applied |
|---------|------|-------------|
| Cashier cannot close bill | [GAP] | Added `can_close_bill` to cashier role |
| ... | | |

## Files Changed
- `src/backend/config/permissions.ts`
- `src/backend/config/role-permissions.ts`
- `src/backend/config/migrations/0001-SeedInitialData.cjs`
- `src/backend/config/migrations/1700000000005-SeedPermissions.cjs`
- `src/backend/config/migrations/1700000000007-AssignPermissionsToRoles.cjs`
- `pages/api/bills/...`

## Test Plan
- [ ] Reinstall app with updated migrations and verify each role can access their expected routes
- [ ] Confirm cashier can close bills
- [ ] Confirm cashier cannot reopen or cancel bills
- [ ] Confirm supervisor can close, cancel, and reopen bills
- [ ] Confirm sales cannot close bills
- [ ] Confirm admin cannot create or close bills

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Return the PR URL to the user.
