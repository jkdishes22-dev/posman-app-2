---
name: pwa-deployment-release
description: Builds and validates production deployment artifacts for this POS PWA project, including web PWA readiness and Electron installers. Use when the user asks to deploy, build for deployment, package for install, create downloadable builds, or verify modern browser compatibility.
---

# PWA Deployment Release

## Purpose

Create a reliable deployment build flow for this repository so the app can:
- run as a production web PWA,
- be installable/downloadable from supported browsers, and
- be packaged as Electron installers when requested.

## Trigger Scenarios

Use this skill when the user asks to:
- deploy the app,
- build for deployment,
- prepare installable/downloadable release artifacts,
- package Windows/macOS/Linux installers,
- validate browser install compatibility.

## Required Preflight (Do First)

Before running any deployment or packaging command, read:
- `next.config.mjs`
- `electron-builder.config.js` (if installer packaging is requested)
- `scripts/build-electron.js`
- `scripts/afterPackHook.js`
- `public/sw.js`
- `public/sw-custom.js`
- `.github/workflows/test-windows-installer.yml` (if CI parity is needed)

If preflight reveals conflicting config (for example, missing standalone output prerequisites), fix or report it before building.

## Deployment Workflows

### 1) Web PWA Deployment Build

Run from project root:

```bash
npm run build
```

Then run the production server in a deployment-like mode (command depends on repo scripts, usually `npm run start`) and verify:
- `manifest.json` is served,
- service worker is registered (`/sw.js`),
- install prompt is available in supported browsers,
- app works after refresh/offline fallback scenarios.

### 2) Installer Packaging (Electron)

This repo expects Next standalone artifacts for Electron packaging.

Use the sequence:

```bash
npm run build
node scripts/build-electron.js win
```

For other platforms, pass the relevant target to the same script (for example `mac` or `linux`) if supported by the script.

Key validation after packaging:
- output artifacts exist in `dist-electron/`,
- packaged app includes `.next/standalone/server.js` in one of expected install/package locations,
- installer can launch app successfully.

Use `scripts/test-installer-local.ps1` on Windows for local installer verification.

## Browser Compatibility Expectations

Target modern mainstream browsers:
- Chrome (desktop/mobile),
- Edge,
- Firefox,
- Safari (macOS/iOS; install UX differs from Chromium).

Verification checklist:
- HTTPS deployment (or localhost for local testing).
- Valid manifest with icons and install metadata.
- Service worker active and controlling pages.
- No critical console/runtime errors in production build.
- Install flow works where supported (A2HS/install button or browser menu install).

## Output Format for Responses

When running this skill, return:
1. **Preflight findings** (files checked + noteworthy config).
2. **Commands executed** (exact commands).
3. **Artifacts produced** (paths and filenames).
4. **PWA installability results** by browser.
5. **Blockers and fixes** (or confirm none).

## Failure Handling

If build or packaging fails:
- include exact failing command,
- include the first actionable error,
- propose the smallest fix,
- rerun verification after applying the fix.

Do not claim deployment readiness until both artifact checks and installability checks pass.
