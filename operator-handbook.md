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

3. Bundle the public key in the app (required before every first build with a new keypair):

```bash
cp ~/posman-license-keys/license-public.pem public/license/public-key.pem
```

Commit this file. The Electron installer reads `public/license/public-key.pem` at startup to verify license signatures. If the file in the repo does not match the private key used to sign licenses, every activation attempt will fail with "License signature verification failed".

> **What changed in v3.1.6**: a key mismatch in the bundled `public/license/public-key.pem` was corrected. Installers built from v3.1.6 onward bundle the correct key and do not require the `LICENSE_PUBLIC_KEY` env-var workaround on client machines.

---

## Build and distribution

- Build installer once per release (for example `0.1.28`).
- Distribute the same `.exe` via Google Drive/Dropbox.
- No per-client rebuild is required for different trial durations.

---

## Generate license batches

Key arguments:

| Argument | Default | Description |
|---|---|---|
| `--privateKey` | _(required)_ | Absolute path to `license-private.pem` |
| `--version` | `unknown-version` | App version label (informational only) |
| `--count` | `5` | Number of trial licenses to generate |
| `--months` | `1` | Trial duration in months |
| `--planType` | `trial<months>m` | Plan label on the trial licenses (e.g. `trial3m`, `trial6m`) |
| `--includeLifetime` | `1` | Set to `0` to suppress the lifetime license |
| `--customerRef` | `unassigned` | Reference tag for your records |
| `--out` | `build/licenses/` | Output directory |
| `--name` | _(timestamp)_ | Output filename (without `.json`) |

Example — 1-month trial batch:

```powershell
node scripts/generate-licenses.js --privateKey="C:\Users\Administrator\posman-license-keys\license-private.pem" --version=3.1.6 --count=10 --months=1 --planType=trial1m --includeLifetime=0 --customerRef=batch-1m-2026-06
```

3-month batch:

```powershell
node scripts/generate-licenses.js --privateKey="C:\Users\Administrator\posman-license-keys\license-private.pem" --version=3.1.6 --count=10 --months=3 --planType=trial3m --includeLifetime=0 --customerRef=batch-3m-2026-06
```

Lifetime-only (no trial codes):

```powershell
node scripts/generate-licenses.js --privateKey="C:\Users\Administrator\posman-license-keys\license-private.pem" --version=3.1.6 --count=0 --includeLifetime=1 --customerRef=lifetime-2026-06
```

> The `--planType` flag only affects the label on trial licenses. Lifetime licenses always get `planType: "lifetime"` and `expiresAt: null` regardless of this argument — they never expire.

---

## Client public key setup (legacy fallback — not needed for v3.1.6+)

Installers built from v3.1.6 onward bundle the correct public key inside the app. Customers do not need to set any environment variable.

If you are supporting a client running a pre-3.1.6 installer and cannot immediately upgrade, use this workaround to inject the correct key at runtime:

```powershell
$pub = Get-Content "C:\Users\Administrator\posman-license-keys\license-public.pem" -Raw
[Environment]::SetEnvironmentVariable("LICENSE_PUBLIC_KEY", $pub, "User")
```

After setting, the client must sign out/in (or reboot) and relaunch the app before activating a code. **Upgrade to v3.1.6+ as soon as possible** so the env-var dependency is no longer needed.

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

- **License signature verification failed**: the public key used to verify the license does not match the private key used to sign it. Most likely causes:
  - The installer was built before the correct `public/license/public-key.pem` was committed (pre-v3.1.6 issue). Fix: upgrade the client to v3.1.6+.
  - The license code was generated with a different private key than the one paired with the bundled public key. Re-generate codes using the matching private key.
  - Stale `LICENSE_PUBLIC_KEY` env-var from a previous workaround. Clear the variable and relaunch.
- **License expired**: issue a renewal or lifetime code.
- **License is bound to a different machine**: issue a new code for the replacement machine.

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

1. Verify `public/license/public-key.pem` in the repo matches the private key you use to generate licenses. Run a quick sanity check:
   ```bash
   node -e "
   const c=require('crypto'),fs=require('fs');
   const priv=fs.readFileSync('/path/to/license-private.pem','utf8');
   const pub=fs.readFileSync('public/license/public-key.pem','utf8');
   const msg=Buffer.from('test');
   const sig=c.sign(null,msg,priv);
   console.log(c.verify(null,msg,pub,sig)?'KEYS MATCH':'MISMATCH - do not build');
   "
   ```
2. Tag and push (or run the release workflow your repo uses).
3. Confirm the Windows workflow completed and the artifact/installer matches the intended version.
4. Smoke-test activate + login + one bill on a clean VM or staging machine before announcing to customers.
