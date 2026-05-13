param(
    [string]$Version = "1.0.0",
    [string]$ElectronVersion = "22.3.27"
)

$ErrorActionPreference = "Stop"

Write-Host ">>> Node $(node --version) | npm $(npm --version)"
Write-Host ">>> Target: Electron $ElectronVersion (Win7 legacy) | version: $Version"

Write-Host ">>> Installing dependencies"
npm ci --legacy-peer-deps
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ">>> Pinning legacy runtime deps (Electron $ElectronVersion)"
npm install --no-save "electron@$ElectronVersion" better-sqlite3@8.7.0 keytar@7.9.0
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ">>> Building Next.js (standalone)"
$env:ELECTRON_BUILD = "true"
$env:NODE_ENV = "production"
if (-not $env:JWT_SECRET) { $env:JWT_SECRET = "build-token" }
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if (-not (Test-Path ".next\standalone\server.js")) {
    Write-Error "ERROR: .next\standalone\server.js not found"
    exit 1
}

Write-Host ">>> Packaging Win7 legacy installer"
$env:BUILD_VERSION = "win7-v$Version"
$env:ELECTRON_VERSION = $ElectronVersion
$env:GH_TOKEN = ""
npx electron-builder `
    --win --x64 `
    --config electron-builder.config.cjs `
    --config.compression=store `
    --config.npmRebuild=false `
    "--config.win.artifactName=JK PosMan Setup $Version-win7-`${arch}.`${ext}" `
    --publish never
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ">>> Verifying output"
$exes = Get-ChildItem -Path dist-electron -Filter "*-win7-*.exe" -ErrorAction SilentlyContinue
if ($exes.Count -eq 0) { Write-Error "No win7-labeled .exe found in dist-electron"; exit 1 }

Write-Host ">>> Copying to docker-build-electron\"
New-Item -ItemType Directory -Force -Path "docker-build-electron" | Out-Null
Get-ChildItem -Path dist-electron -Include "*-win7-*.exe","*-win7-*.exe.blockmap" -ErrorAction SilentlyContinue | ForEach-Object {
    Copy-Item $_.FullName "docker-build-electron\"
    Write-Host "  Built: $($_.Name)  ($([math]::Round($_.Length / 1MB, 2)) MB)"
}

Write-Host ">>> Done - installer is in docker-build-electron\"