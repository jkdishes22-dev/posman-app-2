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
