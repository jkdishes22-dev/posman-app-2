# Build Platform Installer

Build and verify the Electron desktop installer for a target platform. On macOS, also smoke-test the resulting DMG.

Usage: `/build-installer <platform>` where platform is `mac`, `win`, or `linux`.

---

## Step 0 — Parse platform argument

Read the first word of the arguments passed to this skill. Valid values: `mac`, `win`, `linux`.

- If no argument is provided or it is not one of the three valid values, stop immediately and tell the user:
  ```
  Usage: /build-installer <platform>
  Platforms: mac | win | linux
  ```

Set `PLATFORM` to the parsed value. Set `CURRENT_PLATFORM` by checking `process.platform` via:
```bash
node -e "console.log(process.platform)"
```
Expected values: `darwin` (Mac), `win32` (Windows), `linux`.

Determine whether this is a cross-compilation:
- `PLATFORM=win` and `CURRENT_PLATFORM != win32` → cross-compile
- `PLATFORM=mac` and `CURRENT_PLATFORM != darwin` → cross-compile
- `PLATFORM=linux` and `CURRENT_PLATFORM != linux` → cross-compile

If cross-compiling, warn the user:
```
⚠️  Cross-compilation: building PLATFORM installer on CURRENT_PLATFORM.
   Native modules will not be rebuilt. The installer may not launch on the
   target OS. For production builds, build on the target platform.
```

---

## Step 1 — Pre-flight checks

Run these checks before building. If any fail, fix or report before proceeding.

### 1a — TypeScript and lint (fast gate)
```bash
npm run tsc
npm run lint
```
If either fails, stop and tell the user to run `/fix-ci` first.

### 1b — Verify build entrypoints exist
```bash
ls electron/main.cjs
ls electron-builder.config.js
ls scripts/build-electron.js
ls scripts/afterPackHook.js
```
Report any missing files as blockers.

### 1c — Check disk space (build output can be 300–600 MB)
```bash
df -h . | tail -1
```
Warn if available space is under 2 GB.

---

## Step 2 — Build Next.js in standalone mode

Run the Next.js build with `ELECTRON_BUILD=true`:

```bash
ELECTRON_BUILD=true NODE_ENV=production npm run build 2>&1
```

After the build completes, verify the standalone output:
```bash
ls .next/standalone/server.js
```

If `.next/standalone/server.js` does not exist, stop with:
```
❌ Standalone build not produced. Check next.config.mjs — output must be 'standalone' when ELECTRON_BUILD=true.
```

---

## Step 3 — Run electron-builder for the target platform

Use the existing npm script:

```bash
npm run electron:build:<PLATFORM>
```

Where `<PLATFORM>` is `mac`, `win`, or `linux` from Step 0.

Capture output. The build writes to `dist-electron/`.

If the build fails:
- Read the last 50 lines of output carefully
- Common failures and fixes:
  - **"Cannot find module"** → run `npm ci` and retry
  - **"standalone not found"** → Step 2 output was missing; rerun Step 2 first
  - **"Cannot cross compile"** / native module errors → add `--config.npmRebuild=false` flag: run `npx electron-builder --<PLATFORM> --config.npmRebuild=false` instead
  - **DMG creation error on macOS** → ensure Xcode command line tools are installed: `xcode-select --install`
  - **Code signing errors** → the config already sets `signAndEditExecutable: false` and `CSC_IDENTITY_AUTO_DISCOVERY: false`; if errors persist set env `CSC_IDENTITY_AUTO_DISCOVERY=false` explicitly
- After fixing, retry once. If it still fails, report the error and stop.

---

## Step 4 — Verify build output

### 4a — List what was produced
```bash
ls -lh dist-electron/
```

Expected output by platform:

| Platform | Expected files |
|---|---|
| `mac` | `*.dmg`, `*.zip`, `mac/` or `mac-arm64/` unpacked directory |
| `win` | `*.exe` (NSIS installer), `*.exe` (portable), `win-unpacked/` or `win-x64-unpacked/` |
| `linux` | `*.AppImage`, `*.deb` |

### 4b — Verify `.next/standalone` was copied into the unpacked app

Find the unpacked directory:
```bash
find dist-electron -name "server.js" -path "*standalone*" 2>/dev/null
```

If `server.js` is not found inside any unpacked directory, the `afterPackHook.js` or `extraResources` config did not work. Read `scripts/afterPackHook.js` and `electron-builder.config.js` to diagnose, then report to the user. Do NOT silently continue — this would produce an installer that launches but shows a blank screen.

### 4c — Report installer sizes
```bash
find dist-electron -maxdepth 1 -name "*.dmg" -o -name "*.exe" -o -name "*.AppImage" -o -name "*.deb" | xargs ls -lh 2>/dev/null
```

---

## Step 5 — Smoke-test the Mac installer (Mac only, skip for win/linux)

Only execute this step if `PLATFORM=mac` AND `CURRENT_PLATFORM=darwin`.

### 5a — Find the DMG
```bash
find dist-electron -maxdepth 1 -name "*.dmg" | head -1
```
Store the path as `DMG_PATH`.

### 5b — Mount the DMG
```bash
hdiutil attach "<DMG_PATH>" -nobrowse -quiet
```
Capture the mount point — it appears in the output as `/Volumes/<AppName>`. Store as `MOUNT_POINT`.

### 5c — Verify the app bundle exists on the mounted volume
```bash
ls "/Volumes/<AppName>/"
find "/Volumes/<AppName>" -name "*.app" -maxdepth 1
```
Confirm the `.app` bundle is present.

### 5d — Check the app bundle structure
```bash
APP_PATH=$(find "/Volumes/<AppName>" -name "*.app" -maxdepth 1 | head -1)
ls "$APP_PATH/Contents/MacOS/"
ls "$APP_PATH/Contents/Resources/" | head -20
```
Confirm:
- The executable exists in `Contents/MacOS/`
- `Contents/Resources/` contains `.next/standalone` or `app.asar.unpacked/.next/standalone`

### 5e — Launch the app and wait for it to start
```bash
open "$APP_PATH" && sleep 5
```
Then check if the process is running:
```bash
pgrep -f "JK PosMan" | head -3
```

Wait up to 15 seconds for the app to fully start (it needs to boot the Next.js server):
```bash
sleep 10
curl -s -o /dev/null -w "%{http_code}" http://localhost:8817/api/system/setup-status 2>/dev/null || echo "not_ready"
```

Report the HTTP status:
- `200` or `302` → app is running correctly
- `not_ready` or connection refused → app may still be starting; check logs
- Any other code → note it but do not fail (DB may not be configured locally)

### 5f — Capture app logs (if the launch check failed)
The app writes logs to `~/Library/Logs/JK PosMan/` or `~/AppData/Local/JK PosMan/logs/` (Windows). On Mac:
```bash
find ~/Library/Logs -name "*.log" -path "*PosMan*" 2>/dev/null | head -3 | xargs tail -30 2>/dev/null
```

### 5g — Quit the app and unmount the DMG
```bash
pkill -f "JK PosMan" 2>/dev/null || true
sleep 2
hdiutil detach "<MOUNT_POINT>" -quiet 2>/dev/null || true
```

---

## Step 6 — Summary report

Output:

```
## Build Result: <PLATFORM>

| Step | Status | Notes |
|---|---|---|
| TypeScript check | PASS / FAIL | |
| ESLint | PASS / FAIL | |
| Next.js standalone build | PASS / FAIL | .next/standalone/server.js exists |
| electron-builder | PASS / FAIL | |
| .next/standalone in installer | YES / NO | path found |
| Installer file | <filename> (<size>) | |
| Mac smoke test: DMG mounts | PASS / SKIP / FAIL | |
| Mac smoke test: app launches | PASS / SKIP / FAIL | HTTP <status> from localhost:8817 |
```

If everything passed: tell the user where to find the installer file and its size.

If any step failed: give the exact error and the fix to apply.

---

## What this skill does NOT do

- Push or publish the installer (use the GitHub Release workflow for that)
- Sign the installer with a production certificate (set `CSC_LINK` + `CSC_KEY_PASSWORD` env vars for that)
- Build for multiple platforms in one run (run the skill once per platform)
- Run database migrations (the app needs a live MySQL DB configured in `.env` to function after launch)
