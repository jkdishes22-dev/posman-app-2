perf# Performance Audit & Fix

Perform a full performance audit of all API routes and backend services in this Next.js + TypeORM + MySQL project, then apply targeted fixes, and open a PR on GitHub.

## Stack Context
- Framework: Next.js 15 (Pages Router), API routes in `pages/api/`
- ORM: TypeORM 0.3.20 with MySQL
- Services: `src/backend/service/`
- Controllers: `src/backend/controllers/`
- Cache: `src/backend/utils/cache.ts` (in-memory, TTL-based)
- Auth middleware: `src/backend/middleware/auth.ts`

---

## Step 0 — Create a Branch from Main

Before touching any files, run these git commands:

```bash
git fetch origin main/btw
git checkout main
git pull origin main
git checkout -b perf/query-optimizations-$(date +%Y%m%d)
```

If the branch already exists, append a counter (e.g. `-2`). Confirm the new branch is active before proceeding.

---

## Step 1 — Scan for Performance Issues

For each file in `src/backend/service/**/*.ts` and `pages/api/**/*.ts`, check for:

### A. N+1 Queries
Look for patterns where a query result is iterated and a new DB call is made per item, e.g.:
```ts
const items = await repo.find(...)
for (const item of items) {
  item.extra = await anotherRepo.findOne(...)  // N+1
}
```
**Fix:** Use `.leftJoinAndSelect()` or `.createQueryBuilder()` with a single JOIN.

### B. Missing or Misconfigured Cache
- Service methods that query the DB but never call `cache.get()` / `cache.set()`
- Routes that call the service without checking route-level cache
- Reference data (lists, configs) using the default TTL when a longer one (10–30 min) is appropriate
- After writes, check that `cache.invalidate()` is called with the correct key pattern

### C. Unfiltered / Unbounded Queries
- `repo.find()` or `.getMany()` with no `where` clause on large tables
- No `take`/`limit` on list queries that could return thousands of rows
- SELECT * patterns (loading all columns when only a few are needed)
**Fix:** Add `.where()`, `.select([...])`, and `.take(limit)` / query params for pagination.

### D. Multiple Queries That Can Be One
- Two sequential `await` calls that can be combined into a single JOIN or subquery
- `findOne` after `update` when the updated data is already known
**Fix:** Combine into a single query or reuse known values.

### E. Missing DB Indexes
Check entity files in `src/backend/entities/**/*.ts` for:
- Foreign key columns without `@Index`
- Columns used in `.where()` or `ORDER BY` without `@Index`
- High-cardinality filter columns (status, type, created_at) on large tables without indexes
**Fix:** Add `@Index()` decorator on the entity column.

### F. TypeORM Anti-Patterns
- `synchronize: true` in production (auto-sync causes schema checks on every query)
- Relations loaded with `eager: true` when not always needed
- `relations: ["a", "b", "c"]` loading deep nested objects when only IDs are needed
**Fix:** Use explicit `select` + `leftJoin` only when needed.

### G. Auth Middleware Overhead
Check `src/backend/middleware/auth.ts`:
- Is the user object / roles cached per token? (Should be — verify NodeCache or similar)
- Is `jwt.verify()` called synchronously in a hot path?
- Are permission lookups hitting the DB on every request?

---

## Step 2 — Prioritize by Impact

Rank each issue found by estimated impact:
- **Critical** (>1s saved): N+1 on large tables, unbounded queries, missing indexes on FK columns
- **High** (200–1000ms): Missing cache on frequently-called endpoints, redundant queries
- **Medium** (50–200ms): Suboptimal TTL, minor extra queries
- **Low** (<50ms): Code style, minor redundancy

---

## Step 3 — Apply Fixes

For each **Critical** and **High** priority issue:
1. Read the file first with the Read tool
2. Apply the fix with the Edit tool
3. Add a brief inline comment: `// perf: <reason>`
4. If a DB index is needed, note the entity file and column — add `@Index()` if not already present

Do NOT:
- Add pagination to endpoints that the frontend doesn't support yet (check `pages/api` for existing `page`/`limit` query params first)
- Change cache invalidation logic without understanding all write paths
- Modify migration files

---

## Step 4 — Commit & Push

After all fixes are applied, stage and commit only the changed files (never use `git add -A` or `git add .`):

```bash
git add <file1> <file2> ...
git commit -m "perf: optimise query performance across services

- <one line per fix applied>

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
git push -u origin HEAD
```

---

## Step 5 — Open a Pull Request

Use the `gh` CLI to create a PR targeting `main`:

```bash
gh pr create \
  --base main \
  --title "perf: query & cache optimisations" \
  --body "$(cat <<'EOF'
## Summary
<bullet list of all fixes applied from Step 3>

## Issues Fixed
| File | Issue | Fix Applied | Est. Improvement |
|------|-------|-------------|-----------------|
| ...  | ...   | ...         | ...             |

## Indexes Requiring Migration
List any `@Index()` additions that need `npm run migration:generate` + `npm run migration:run` before they take effect.

## Test Plan
- [ ] Verify slow endpoints respond in <200ms after cache warm-up
- [ ] Confirm cache invalidation still fires on write operations
- [ ] Check no existing tests are broken

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Return the PR URL to the user at the end.
