# POSMan License Operator Handbook

## Purpose

Internal operational handbook for issuing, validating, renewing, transferring, and rotating offline machine-bound licenses.

## Audience

- License Admin
- Support Team
- Security Owner

## Core Model

- Licenses are signed certificates.
- App verifies signatures offline using `LICENSE_PUBLIC_KEY`.
- License authority is local encrypted storage + OS secure store, not DB.
- One license is bound to one machine profile.

---

## Quick Runbook (5 Minutes)

1. Identify request type: issue, renewal, transfer, upgrade.
2. Verify customer identity and entitlement.
3. Generate/select correct code.
4. Send only `code` value.
5. Confirm activation.
6. Update ledger before closing ticket.

---

## Day 1 Production Checklist

1. Generate production keys outside repository.
2. Back up private key to encrypted vault + offline backup.
3. Configure `LICENSE_PUBLIC_KEY` in production runtime.
4. Set `LICENSE_ENFORCEMENT=1`.
5. Generate first production batch.
6. Validate one full activation flow.
7. Verify blocked states (required/invalid/expired).
8. Confirm diagnostics are admin-only and sanitized.
9. Set transfer/lifetime policies.
10. Onboard support team to this runbook.

---

## Key and Environment Setup

Generate keys:

`node scripts/generate-license-keypair.js ~/posman-license-keys`

Generate batch:

`node scripts/generate-licenses.js --privateKey=~/posman-license-keys/license-private.pem --version=0.1.28 --count=5 --months=1 --customerRef=batch-2026-04`

Required env vars:

- `LICENSE_PUBLIC_KEY`
- `LICENSE_ENFORCEMENT`

### Platform snippets

macOS/Linux:

```bash
export LICENSE_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\nYOUR_KEY\n-----END PUBLIC KEY-----"
export LICENSE_ENFORCEMENT=1
```

Windows PowerShell:

```powershell
$env:LICENSE_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----`nYOUR_KEY`n-----END PUBLIC KEY-----"
$env:LICENSE_ENFORCEMENT="1"
```

---

## Issuance Workflow

1. Generate/locate a batch.
2. Select unused license.
3. Record assignment in ledger.
4. Send customer only `code` value.
5. Confirm activation.
6. Mark license `activated`.

### What to share

From batch JSON:

- Trial: `trialLicenses[i].code`
- Lifetime: `lifetimeLicense.code`

Never share:

- `license-private.pem`
- entire internal batch JSON

---

## Renewal Workflow

Trigger: `license_expired`.

1. Verify identity + prior record.
2. Issue replacement code.
3. Confirm activation.
4. Mark old record `expired/replaced`, new `activated`.
5. Link via `replacementForLicenseId`.

---

## Transfer Workflow

Trigger: machine mismatch after hardware/OS change.

1. Verify ownership.
2. Issue replacement code.
3. Retire old record.
4. Link old/new records.
5. Confirm activation.

---

## Lifetime Upgrade Workflow

1. Verify qualification.
2. Issue lifetime code (`expiresAt=null`).
3. Confirm activation.
4. Mark trial as `superseded`.

---

## Private Key Rotation (Recycling)

Rotate when:

- suspected leak
- staff/access change
- scheduled cycle

Steps:

1. Generate new keypair.
2. Track `keySet` names in ledger.
3. Deploy new public key.
4. Issue all new licenses with new private key.
5. Reissue active licenses in migration window.
6. Retire old key set after deadline.

---

## Troubleshooting

- Invalid code: check copy errors, key mismatch.
- Immediate expiry: check system clock/timezone.
- Suddenly invalid: machine change or secure-store reset.
- Script errors: wrong path / env / permissions.

---

## Ledger Fields (Minimum)

- `licenseId`
- `customerRef`
- `planType`
- `issuedAt`
- `expiresAt`
- `status`
- `appVersion`
- `replacementForLicenseId`
- `issuedByKeySet`
- `notes`

---

## Anti-Abuse Controls

- identity verification before replacement
- transfer-rate limits
- suspicious-pattern escalation

---

## Release Checklist

- [ ] Windows installers are produced on a Windows host/CI runner (x64)
- [ ] public key configured
- [ ] enforcement enabled
- [ ] blocked states verified
- [ ] diagnostics protected
- [ ] support notified of policy changes
- [ ] installer terms file updated (`LICENSE_TERMS.txt`) when legal text changes
- [ ] packaged app contains valid Windows `keytar.node` at `.next/standalone/node_modules/keytar/build/Release/keytar.node`

---

## Terms and Conditions During Installation

### Windows Installer (Implemented)

- NSIS installer is configured with a license page using `LICENSE_TERMS.txt`.
- User must click **I Agree** to continue.
- If user rejects, installer aborts before completion (no finalized installation state).

### macOS DMG / Linux AppImage (Limitation)

- DMG and AppImage flows do not provide the same built-in pre-install acceptance gate as NSIS.
- For these platforms, keep terms in distribution docs and optionally enforce acceptance on first app launch if required by policy.

