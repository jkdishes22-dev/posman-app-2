---
name: lint-fixer
description: Plans and fixes linting issues across a codebase, covering both existing and newly introduced issues. Use when the user asks to fix lint, linter, eslint, ts, typecheck, warnings, or code-quality issues.
---

# Lint Fixer

## Purpose

Resolve linting problems end-to-end with a predictable workflow:
- Prioritize changed files by default.
- Address both pre-existing and newly introduced issues.
- Use hybrid fixing: safe autofix first, then targeted manual fixes.
- Report progress in checklist format.

## Trigger Guidance

Apply this skill automatically when the request includes terms like:
- lint
- linter
- eslint
- style errors
- warnings
- typecheck
- ts errors

## Default Behavior

1. Scope defaults to changed files first.
2. Run safe autofix (`--fix`) where available.
3. Re-run lint/typecheck to collect remaining issues.
4. Manually fix unresolved issues.
5. Re-run checks until clean or blocked by external constraints.
6. Include both existing and newly introduced issues in the plan and status.

## Workflow

Copy this checklist and update status during execution:

```markdown
Lint Fix Progress:
- [ ] Detect package manager and lint/typecheck commands
- [ ] Collect baseline lint results (changed files first)
- [ ] Apply safe autofixes
- [ ] Re-run lint and typecheck
- [ ] Manually fix remaining issues
- [ ] Re-run all checks for verification
- [ ] Summarize fixed issues, remaining issues, and blockers
```

### Step 1: Detect Commands

Use repo scripts first:
- `npm run lint`
- `npm run typecheck`

If script names differ, inspect `package.json` and use equivalent project commands.

### Step 2: Baseline (Changed Files Default)

Prefer changed-file scope first:
- Run lint commands that support file targeting.
- If tooling does not support it, run full lint and then prioritize fixes in changed files.

### Step 3: Safe Autofix Pass

Run safe autofix first:
- `npm run lint -- --fix`

If not supported, use the project's equivalent autofix command.

### Step 4: Manual Fix Pass

For remaining issues:
- Fix errors first, then warnings (unless configured as errors).
- Avoid broad refactors unrelated to lint failures.
- Keep changes minimal and behavior-preserving.

### Step 5: Verification

Always re-run:
- lint
- typecheck (if present)

Do not claim success unless checks pass or blockers are clearly stated.

## Output Format (Checklist Style)

Return results in this structure:

```markdown
Lint Fix Report

- Scope: changed files first (default)
- Commands run: <list>
- Autofix applied: yes/no

Progress:
- [x] Detect package manager and lint/typecheck commands
- [x] Collect baseline lint results (changed files first)
- [x] Apply safe autofixes
- [x] Re-run lint and typecheck
- [x] Manually fix remaining issues
- [x] Re-run all checks for verification
- [x] Summarize fixed issues, remaining issues, and blockers

Fixed:
- <bullet list of concrete fixes>

Remaining:
- <bullet list, or "None">

Blockers:
- <bullet list, or "None">
```

## Guardrails

- Never ignore lint rules by default (no blanket disables).
- Avoid changing unrelated files.
- Preserve project conventions and existing architecture.
- If a fix is risky, describe it and request confirmation before applying.
