# JK PosMan Operator Handbook

This handbook is for the app author/operator: licensing, Windows desktop deployment, backup/restore, and infra notes. Customer-facing activation steps stay in `license-customer-help.md`.

## Documentation index

Use this section as the entry point when you are unsure which file to open.

### Start here

- **This handbook** (`operator-handbook.md`): internal licensing, builds, Windows install/upgrade, restore, diagnostics, CI/infra
- **Customer help**: `license-customer-help.md` (share with customers for activation)
- **Short redirect**: `license.md` points here so old bookmarks still work

### Which file should I read?

- If you issue licenses, handle renewals/transfers, manage keys, or ship desktop builds → **`operator-handbook.md`** (this file)
- If you are helping customers activate codes → **`license-customer-help.md`**

### Most common quick answers

- Share with customer: `trialLicenses[i].code` or `lifetimeLicense.code`
- Never share: `license-private.pem`
- First production setup: complete [One-time setup](#one-time-setup) and [Deployment (Windows desktop)](#deployment-windows-desktop); take a [backup](#backup-and-restore) before go-live

### Notes

- Binding legal terms: **`LICENSE_TERMS.txt`**
- In-app licensing: Admin → License (`src/app/admin/license/page.tsx`); activation API: `pages/api/system/license-activate.ts`
- On startup, SQLite runs migrations then **`PRAGMA quick_check`**. If the database file is corrupt or inconsistent (bad manual copy, partial swap), setup fails fast with a clear error instead of random runtime failures—fix by [restore](#backup-and-restore) from a good backup

---

## One-time setup

1. Generate keypair once:

```powershell
node scripts/generate-license-keypair.js ~/posman-license-keys
```

2. Keep private key secret:

- `license-private.pem` stays with operator only.
- Never send private key to clients.

3. Public key distribution:

- `license-public.pem` can be shipped to clients or embedded in deployment process.

---

## Build and distribution

- Build installer once per release (for example `0.1.28`).
- Distribute the same `.exe` via Google Drive/Dropbox.
- No per-client rebuild is required for different trial durations.

---

## Generate license batches

Example used in operations:

```powershell
node scripts/generate-licenses.js --privateKey="C:\Users\Administrator\posman-license-keys\license-private.pem" --version=0.1.28 --count=1 --months=1 --includeLifetime=0 --customerRef=debug-match
```

For larger batches, adjust only `--count` and `--months`:

```powershell
node scripts/generate-licenses.js --privateKey="C:\Users\Administrator\posman-license-keys\license-private.pem" --version=0.1.28 --count=50 --months=3 --includeLifetime=0 --customerRef=batch-3m-2026-05
```

To generate a lifetime code:

```powershell
node scripts/generate-licenses.js --privateKey="C:\Users\Administrator\posman-license-keys\license-private.pem" --version=0.1.28 --count=0 --includeLifetime=1 --customerRef=lifetime-batch-2026-05
```

---

## Client public key setup (if env-based)

```powershell
$pub = Get-Content "C:\Users\Administrator\posman-license-keys\license-public.pem" -Raw
[Environment]::SetEnvironmentVariable("LICENSE_PUBLIC_KEY", $pub, "User")
```

After setting, client should sign out/in (or reboot), then launch app and activate a code.

---

## License diagnostics reference

Expected healthy status in Admin → License Diagnostics:

- State: `ready`
- Code: `LICENSE_READY`
- Plan: `trial1m` or `lifetime`
- Message: `License is valid.`

Dates are shown in `YYYY-MM-DD` format.

---

## Troubleshooting

- **License signature verification failed**: public/private key mismatch or stale environment.
- **License expired**: issue renewal/lifetime code.
- **Different machine binding**: issue a new code for replacement machine.

---

## Deployment (Windows desktop)

### What ships vs what persists

- **Replaced on each install/upgrade**: application binaries under the install directory (and unpacked app resources).
- **Persists** (do not assume the installer “resets” these):
  - Electron **`userData`** (Windows: typically `%APPDATA%\JK PosMan\`) — see `electron/main.cjs` (`app.getPath("userData")` is logged at startup).
  - **Live database**: `posman.db` in `userData` (same file path is passed as `SQLITE_DB_PATH` from the main process).
  - **Automatic backups**: `backups` subfolder under `userData` (see `electron/main.cjs`).
- **First launch after upgrade**: TypeORM migrations run, then SQLite integrity quick check. Back up before upgrading if the DB matters.

### Supported builds (CI)

- Prefer **GitHub Actions** Windows x64 artifacts for production installers: `.github/workflows/build-windows-x64.yml` and `build-windows-keytar-stable.yml`.
- **keytar** and other native deps: reliable Windows builds are produced on **Windows runners**; do not rely on macOS cross-build for Windows native modules unless you follow the manual prebuild swap documented in `README.md`.

### Safe install / upgrade / reinstall

1. **Backup** the database (in-app **Admin → Settings**, or copy `posman.db` while the app is quit — see [Backup and restore](#backup-and-restore)).
2. Install the new build from your trusted channel (same as prior: Drive/Dropbox/GitHub Release artifact).
3. Launch once and confirm Admin → License / a smoke transaction; if setup shows failure, check logs and consider restore from backup.

---

## Backup and restore

### In-app (recommended)

- **Admin → Settings** (`/admin/settings`): Database backup / restore controls (SQLite desktop mode).
- **Admin → Help** (`/help/admin`): Journey **“Back up and restore the database (SQLite)”** — step-by-step for operators.

### Manual fallback (if in-app restore fails)

1. **Quit JK PosMan completely** (including system tray) so `posman.db` is not locked.
2. Open **`%APPDATA%\JK PosMan\`** (same root as the live DB and `backups\` on Windows).
3. Copy your chosen backup over `posman.db`.
4. **WAL/SHM**: If the backup set includes matching `posman.db-wal` / `posman.db-shm`, copy those to the same names next to `posman.db`. If not, **delete** stale `posman.db-wal` and `posman.db-shm` so SQLite does not mix an old WAL with the restored main file.

---

## Infra and debugging

### Logs

- Log directory is resolved in **`electron/main.cjs`** (`resolveLogDir()`):
  - **Windows**: `%APPDATA%\JK PosMan\logs\` (Roaming, not LocalAppData)
  - **macOS**: `~/Library/Logs/JK PosMan/`
  - **Linux**: `~/.local/share/JK PosMan/logs/`
- Filenames: `app-YYYY-MM-DD.log` (one file per calendar day).

### Dev / server SQLite

- **`DB_MODE`**: use the value your environment expects for SQLite vs MySQL (see `.env.example` / project docs).
- **`SQLITE_DB_PATH`**: optional override for the SQLite file when not using Electron defaults.

### GitHub release checklist (short)

1. Tag and push (or run the release workflow your repo uses).
2. Confirm the Windows workflow completed and the artifact/installer matches the intended version.
3. Smoke-test activate + login + one bill on a clean VM or staging machine before announcing to customers.

---

## Trusted distribution (installation activation)

Every desktop installer requires a one-time activation before the app starts. This prevents unauthorised copies — each installation is tied to its machine hardware. The owner generates codes using the **Posman Activator** PWA (`tools/activate.html`).

### How the system works

1. Technician installs the app on the client's machine.
2. The app shows an **Installation ID** (e.g. `6015-9D9C-1A31`) derived from that machine's hardware fingerprint.
3. Technician sends the ID to you (the owner).
4. You open the owner PWA (`tools/activate.html`), enter your passphrase, enter the ID, and copy the **activation code**.
5. Technician enters the code in the app — it activates permanently and never asks again.

### Security model

The installer bundles a **derived HMAC key** (`activation/activation.key`), not the passphrase itself. The key is 64 bytes of binary (hex-encoded) produced by PBKDF2 from your passphrase. Someone who extracts the key file from an installed app:

- **Cannot** recover your passphrase (PBKDF2 is one-way).
- **Could** theoretically write code to generate codes for arbitrary fingerprints — but only if they know each target machine's fingerprint, which requires running the app on that machine anyway.

This protects against the primary threat (a technician installing extra copies without your knowledge) while remaining fully offline.

### One-time setup: choose your passphrase

1. Create the passphrase file (gitignored — never committed):

```bash
mkdir -p build/activation
echo 'your-secret-passphrase-here' > build/activation/passphrase
```

2. Use this **exact same passphrase** every time you unlock the owner PWA (`tools/activate.html`).

> Keep this passphrase private. If someone learns it they could generate codes using the owner PWA. Treat it like a password.

### Building an installer

The passphrase is used **only at build time** — `beforePack` derives the HMAC key and writes `build/activation/.derived-key`, which electron-builder copies into the installer. The plain passphrase file is never bundled.

```bash
# Local build (macOS)
npm run electron:build:mac

# CI — supply passphrase via secret environment variable instead of the file
ACTIVATION_PASSPHRASE=your-secret-passphrase-here npm run electron:build:mac
```

If neither `build/activation/passphrase` nor `ACTIVATION_PASSPHRASE` is set, the build fails immediately with a clear error.

### Using the owner PWA

Open `tools/activate.html` in any browser (phone or desktop). It is a standalone HTML file — no server or internet required.

1. Enter your passphrase and click **Unlock**.
2. Paste the **Installation ID** exactly as shown in the app (dashes are stripped automatically).
3. Click **Generate Activation Code** — copy the code.
4. Give the code to the technician to enter in the app.

The log records every code generated. You can export it as CSV for your records.

> **Passphrase must match the build.** Unlocking with a different passphrase produces a different code that the app will reject. Always use the passphrase from `build/activation/passphrase`.

### Changing the passphrase

1. Update `build/activation/passphrase` with the new value.
2. Rebuild all installers (`mac`, `win`, `linux`).
3. Distribute the new installer to any machines that have **not yet been activated** — already-activated machines are unaffected (their `activation.dat` is already written).
4. Use the new passphrase in the owner PWA going forward. Old codes generated with the old passphrase will not work on new installers.

### Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| "Activation is not configured on this build" | `activation.key` missing from installer | Ensure `build/activation/passphrase` exists before building |
| "Invalid activation code" | Wrong passphrase used in PWA | Re-open PWA and unlock with the correct passphrase (`build/activation/passphrase`) |
| Different codes for the same ID | Different passphrases in different PWA sessions | Each browser session prompts for the passphrase — always use the same one |
| Already-activated machine rejected after passphrase change | Hardware change detected | Normal re-activation required; generate a new code with the new passphrase |
