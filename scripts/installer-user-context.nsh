!macro customInstall
  SetShellVarContext current

  StrCpy $0 "$INSTDIR\resources\public\license\public-key.pem"
  StrCpy $1 "$APPDATA\JK PosMan\license"
  StrCpy $2 "$1\public-key.pem"

  IfFileExists "$0" source_exists source_missing

source_exists:
  CreateDirectory "$1"
  ClearErrors
  CopyFiles /SILENT "$0" "$2"
  IfErrors copy_failed copy_ok

copy_ok:
  DetailPrint "License public key copied to: $2"
  Goto done

copy_failed:
  DetailPrint "Warning: failed to copy license public key to user profile path."
  MessageBox MB_ICONEXCLAMATION|MB_OK "JK PosMan was installed, but automatic license key setup failed.$\r$\n$\r$\nManual fallback option 1 (inline):$\r$\n[Environment]::SetEnvironmentVariable('LICENSE_PUBLIC_KEY','<PEM>','User')$\r$\n$\r$\nManual fallback option 2 (from bundled file):$\r$\n$$pub = Get-Content '$INSTDIR\resources\public\license\public-key.pem' -Raw$\r$\n[Environment]::SetEnvironmentVariable('LICENSE_PUBLIC_KEY', $$pub, 'User')$\r$\n$\r$\nRestart JK PosMan after setting the variable."
  Goto done

source_missing:
  DetailPrint "Warning: bundled public key file not found during install."
  MessageBox MB_ICONEXCLAMATION|MB_OK "JK PosMan was installed, but bundled license key file was not found.$\r$\n$\r$\nManual fallback option 1 (inline):$\r$\n[Environment]::SetEnvironmentVariable('LICENSE_PUBLIC_KEY','<PEM>','User')$\r$\n$\r$\nManual fallback option 2 (from file):$\r$\n$$pub = Get-Content 'C:\path\to\public-key.pem' -Raw$\r$\n[Environment]::SetEnvironmentVariable('LICENSE_PUBLIC_KEY', $$pub, 'User')$\r$\n$\r$\nRestart JK PosMan after setting the variable."

done:
!macroend
