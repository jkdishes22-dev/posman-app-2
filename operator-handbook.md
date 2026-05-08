# JK PosMan License Operator Handbook

This guide is for the app author/operator who builds releases and issues license codes.

## One-Time Setup

1. Generate keypair once:

```powershell
node scripts/generate-license-keypair.js ~/posman-license-keys
```

2. Keep private key secret:
- `license-private.pem` stays with operator only.
- Never send private key to clients.

3. Public key distribution:
- `license-public.pem` can be shipped to clients or embedded in deployment process.

## Build and Distribution

- Build installer once per release (for example `0.1.28`).
- Distribute the same `.exe` via Google Drive/Dropbox.
- No per-client rebuild is required for different trial durations.

## Generate License Batches

Example used in operations:

```powershell
node scripts/generate-licenses.js --privateKey="C:\Users\Administrator\posman-license-keys\license-private.pem" --version=0.1.28 --count=1 --months=1 --includeLifetime=0 --customerRef=debug-match
```

For larger batches, adjust only `--count` and `--months`:

```powershell
node scripts/generate-licenses.js --privateKey="C:\Users\Administrator\posman-license-keys\license-private.pem" --version=0.1.28 --count=50 --months=3 --includeLifetime=0 --customerRef=batch-3m-2026-05
```

To generate a lifetime code
```powershell
node scripts/generate-licenses.js --privateKey="C:\Users\Administrator\posman-license-keys\license-private.pem" --version=0.1.28 --count=0 --includeLifetime=1 --customerRef=lifetime-batch-2026-05
```

## Client Public Key Setup (if env-based)

```powershell
$pub = Get-Content "C:\Users\Administrator\posman-license-keys\license-public.pem" -Raw
[Environment]::SetEnvironmentVariable("LICENSE_PUBLIC_KEY", $pub, "User")
```

After setting, client should sign out/in (or reboot), then launch app and activate a code.

## License Diagnostics Reference

Expected healthy status in Admin -> License Diagnostics:
- State: `ready`
- Code: `LICENSE_READY`
- Plan: `trial1m` or `lifetime`
- Message: `License is valid.`

Dates are shown in `YYYY-MM-DD` format.

## Troubleshooting

- **License signature verification failed**: public/private key mismatch or stale environment.
- **License expired**: issue renewal/lifetime code.
- **Different machine binding**: issue a new code for replacement machine.
