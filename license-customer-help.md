# JK PosMan Customer License Help

This guide is for customers installing the app and activating a license code.

## What You Need

- `JK PosMan Setup 3.1.6.exe` (or later)
- A license code from the app author

## Install the App

1. Run the installer.
2. Launch JK PosMan.
3. On first launch, open the login screen license box.

## Activate License

1. Paste the full license code exactly as received.
2. Submit activation.
3. Log in normally after activation succeeds.

## Common Errors

- **License signature verification failed**  
  Make sure you are running version 3.1.6 or later — earlier builds had a bundled key mismatch that caused all activations to fail. Upgrade the installer and retry. If you are already on 3.1.6+, ensure the license code has not been corrupted (copy it again fresh from the email or message you received).
- **License is bound to a different machine**  
  Ask the author for a replacement code issued for this machine.
- **License has expired**  
  Ask the author for a renewal or lifetime code.

## Legacy: Manual Key Setup (pre-3.1.6 only)

If you are running an older installer and cannot upgrade immediately, the app author may ask you to run this once in PowerShell as the same Windows user who launches the app:

```powershell
$pub = Get-Content "C:\path\to\license-public.pem" -Raw
[Environment]::SetEnvironmentVariable("LICENSE_PUBLIC_KEY", $pub, "User")
```

Sign out/in (or reboot) then launch JK PosMan again. This workaround is not needed on v3.1.6+.
