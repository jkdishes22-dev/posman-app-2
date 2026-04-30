# JK PosMan Customer License Help

This guide is for customers installing the app and activating a license code.

## What You Need

- `JK PosMan Setup 0.1.28.exe`
- A license code from the app author
- (If requested by author) the public key file: `license-public.pem`

## Install the App

1. Run the installer.
2. Launch JK PosMan.
3. On first launch, open the login screen license box.

## If Public Key Setup Is Required

Run PowerShell as the same Windows user who launches the app:

```powershell
$pub = Get-Content "C:\Users\Administrator\posman-license-keys\license-public.pem" -Raw
[Environment]::SetEnvironmentVariable("LICENSE_PUBLIC_KEY", $pub, "User")
```

Then sign out/in (or reboot) and launch JK PosMan again.

## Activate License

1. Paste the full license code exactly as received.
2. Submit activation.
3. Log in normally after activation succeeds.

## Common Errors

- **License signature verification failed**  
  Usually key mismatch or app still running with old environment values. Fully close app and retry.
- **License is bound to a different machine**  
  Ask the author for a replacement code.
- **License has expired**  
  Ask the author for a renewal code.
