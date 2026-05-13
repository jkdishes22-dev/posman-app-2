param(
    [string]$Version = "1.0.0"
)

$ErrorActionPreference = "Stop"

Write-Host ">>> Node $(node --version) | npm $(npm --version)"

Write-Host ">>> Installing dependencies"
npm ci --legacy-peer-deps
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

Write-Host ">>> Packaging Windows installer (Electron 39 / Win10-11 target)"
$env:BUILD_VERSION = $Version
$env:GH_TOKEN = ""
npx electron-builder `
    --win --x64 `
    --config electron-builder.config.cjs `
    --config.compression=store `
    --config.npmRebuild=false `
    --publish never
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ">>> Verifying output"
$exes = Get-ChildItem -Path dist-electron -Filter "*.exe" -ErrorAction SilentlyContinue
if ($exes.Count -eq 0) { Write-Error "No .exe found in dist-electron"; exit 1 }

Write-Host ">>> Copying to docker-build-electron\"
New-Item -ItemType Directory -Force -Path "docker-build-electron" | Out-Null
Get-ChildItem -Path dist-electron -Include "*.exe","*.exe.blockmap" -ErrorAction SilentlyContinue | ForEach-Object {
    Copy-Item $_.FullName "docker-build-electron\"
    Write-Host "  Built: $($_.Name)  ($([math]::Round($_.Length / 1MB, 2)) MB)"
}

Write-Host ">>> Done - installer is in docker-build-electron\"