# POSMan Licensing SOP

## Purpose

This SOP defines how to issue, activate, renew, transfer, and upgrade offline single-machine licenses for POSMan.

## Quick Runbook (5-Minute Support Checklist)

Use this when handling day-to-day requests quickly.

1. Identify request type: new issue, renewal, transfer, or lifetime upgrade.
2. Verify customer identity and find prior ledger record.
3. Generate/send correct license code (trial or lifetime).
4. Ask customer to activate in app and confirm status.
5. Update ledger status and notes before closing ticket.

Common closures:
- New customer -> `issued` then `activated`
- Expired customer -> old `expired/replaced`, new `activated`
- Device change -> old `replaced`, new `activated`
- Lifetime upgrade -> trial `superseded`, lifetime `activated`

## Scope

- Applies to all author-issued licenses.
- Applies to trial (`trial1m`) and lifetime (`lifetime`) plans.
- Applies to support, billing, and technical operations involved in licensing.

## Roles

- **License Admin**: Issues and tracks licenses.
- **Support**: Handles activation issues, renewals, and transfers.
- **Security Owner**: Protects private key and manages key rotation.

---

## System Model (Quick Reference)

- App verifies a **signed license certificate** offline using `LICENSE_PUBLIC_KEY`.
- App stores license state in encrypted local storage + OS secure store (`keytar`).
- License is machine-bound (single-device model).
- DB is non-authoritative for licensing.

---

## One-Time Setup

1. Generate signing keys:
   - `node scripts/generate-license-keypair.js`
2. Store `license-private.pem` in a secure secret vault (never commit, never share).
3. Configure app runtime with `LICENSE_PUBLIC_KEY` from `license-public.pem`.
4. Confirm enforcement policy:
   - `LICENSE_ENFORCEMENT=1` in production.

Checklist:
- [ ] Private key stored in secure vault
- [ ] Public key configured in runtime
- [ ] Recovery backup for private key created

---

## Standard Issuance Workflow

### A. Prepare Batch

Run:

`node scripts/generate-licenses.js --privateKey=/absolute/path/license-private.pem --version=0.1.28 --count=5 --months=1 --customerRef=batch-2026-04`

Output:
- JSON file containing issued plaintext codes and metadata.

### B. Assign to Customer

1. Pick one unused code.
2. Record assignment in ledger:
   - `licenseId`, customer, plan, issue date, expiry, app version.
3. Deliver code securely to customer.
4. Mark record as `issued`.

### C. Confirm Activation

1. Customer enters code in app.
2. App validates signature, expiry, and machine binding.
3. Support confirms activation with customer.
4. Mark record as `activated`.

---

## Renewal SOP (Expired Trial)

Trigger:
- Customer blocked with `license_expired`.

Steps:
1. Verify customer identity and prior license record.
2. Generate replacement trial/lifetime code.
3. Send code to customer.
4. Customer activates replacement.
5. Update ledger:
   - old status -> `replaced` or `expired`
   - new status -> `activated`
   - set `replacementForLicenseId`.

---

## Transfer SOP (New Device / Machine Change)

Trigger:
- Customer gets machine-binding mismatch.

Policy (recommended):
- Allow transfer only after identity and entitlement verification.

Steps:
1. Verify customer and original license ownership.
2. Issue replacement code (do not reuse old active code blindly).
3. Mark old license as `replaced` (or `retired`).
4. Link old/new in ledger using `replacementForLicenseId`.
5. Confirm activation on new machine.

---

## Lifetime Upgrade SOP

Trigger:
- Customer qualifies for lifetime plan.

Steps:
1. Verify qualification (billing/compliance milestone).
2. Generate `lifetime` code (`expiresAt: null`).
3. Send code to customer.
4. Customer activates lifetime code.
5. Mark trial as `superseded` and lifetime as `activated`.

---

## Incident SOP

### Private Key Suspected Compromise

1. Stop issuing new licenses immediately.
2. Generate new keypair.
3. Roll out new public key in app update.
4. Reissue affected licenses under new key.
5. Record incident timeline and affected customers.

### Customer Lost License Code

1. Verify identity and prior purchase.
2. Re-send existing entitlement or issue replacement per policy.
3. Log event in ledger.

---

## Ledger Requirements (Mandatory)

Track at minimum:

- `licenseId`
- `customerRef`
- `customerName`
- `planType`
- `issuedAt`
- `expiresAt`
- `status` (`available`, `issued`, `activated`, `expired`, `replaced`, `superseded`)
- `appVersion`
- `replacementForLicenseId`
- `notes`

---

## Operational Guardrails

- Never embed plaintext batch license lists in shipped app.
- Never expose private key to support/dev machines unnecessarily.
- Never share raw internal ledger externally.
- Always record every issuance, replacement, and upgrade action.

---

## Support Response Templates (Short)

### Activation Success
"Your license is now active on this machine. Please keep this device for continued use under your current plan."

### Expired License
"Your trial license has expired. Please enter the replacement code sent by support to continue."

### Machine Transfer
"Your license is machine-bound. We have issued a replacement code for your new device."

---

## Review Cadence

- Weekly: audit newly issued and replaced licenses.
- Monthly: reconcile billing records vs activated licenses.
- Quarterly: review transfer policy abuse signals.

