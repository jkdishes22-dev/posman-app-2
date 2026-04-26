# Local Installer Test Script
# This script mimics what the GitHub Actions workflow does for local testing

param(
    [string]$InstallerPath = "dist-electron\posman-app Setup 0.1.0.exe",
    [string]$InstallDir = "$env:LOCALAPPDATA\Programs\JK PosMan"
)

Write-Host "========================================="
Write-Host "  Local Windows Installer Test"
Write-Host "========================================="
Write-Host ""

# Check if installer exists
if (-not (Test-Path $InstallerPath)) {
    Write-Error "❌ Installer not found: $InstallerPath"
    Write-Host ""
    Write-Host "Please build the installer first:"
    Write-Host "  npm run build"
    Write-Host "  node scripts/build-electron.js win"
    exit 1
}

Write-Host "✅ Installer found: $InstallerPath"
$installerSize = (Get-Item $InstallerPath).Length / 1MB
Write-Host "   Size: $([math]::Round($installerSize, 2)) MB"
Write-Host ""

# Clean up any existing installation
if (Test-Path $InstallDir) {
    Write-Host "⚠️  Existing installation found, removing..."
    Remove-Item -Path $InstallDir -Recurse -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

# Create installation directory
Write-Host "Creating installation directory: $InstallDir"
New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null

# Run installer
Write-Host ""
Write-Host "Running installer silently..."
Write-Host "  Installer: $InstallerPath"
Write-Host "  Target: $InstallDir"
Write-Host ""

$logFile = Join-Path $env:TEMP "installer-test-log.txt"
$process = Start-Process -FilePath $InstallerPath -ArgumentList "/S", "/D=$InstallDir", "/NCRC" -Wait -PassThru -NoNewWindow

Write-Host "Installer exit code: $($process.ExitCode)"
Write-Host ""

# Wait a moment for files to be written
Start-Sleep -Seconds 3

# Check installation
Write-Host "Checking installation..."
if (Test-Path $InstallDir) {
    $items = Get-ChildItem -Path $InstallDir -Recurse -ErrorAction SilentlyContinue
    $itemCount = ($items | Measure-Object).Count
    Write-Host "  Directory exists: Yes"
    Write-Host "  Items installed: $itemCount"
    
    if ($itemCount -eq 0) {
        Write-Host ""
        Write-Error "❌ Installation directory is empty!"
        Write-Host "The installer completed but didn't install any files."
        Write-Host "This suggests the installer may have failed silently."
        exit 1
    }
    
    Write-Host ""
    Write-Host "First 10 installed items:"
    $items | Select-Object -First 10 | ForEach-Object {
        $type = if ($_.PSIsContainer) { "DIR" } else { "FILE" }
        Write-Host "  - $($_.FullName.Replace($InstallDir, '.')) [$type]"
    }
} else {
    Write-Error "❌ Installation directory was not created!"
    exit 1
}

# Find executable
Write-Host ""
Write-Host "Searching for application executable..."
$exeFiles = Get-ChildItem -Path $InstallDir -Filter *.exe -Recurse -ErrorAction SilentlyContinue | 
    Where-Object { 
        $_.Name -notlike "*Uninstall*" -and 
        $_.Name -notlike "*Setup*" -and
        $_.Name -notlike "*Update*"
    }

if ($exeFiles.Count -gt 0) {
    $exe = $exeFiles | Select-Object -First 1
    Write-Host "✅ Found executable: $($exe.FullName)"
    Write-Host "   Name: $($exe.Name)"
    Write-Host "   Size: $([math]::Round($exe.Length / 1MB, 2)) MB"
} else {
    Write-Error "❌ Executable not found!"
    exit 1
}

# Check for critical files
Write-Host ""
Write-Host "Checking critical files..."

# Check for .next/standalone
$standalonePaths = @(
    "$InstallDir\.next\standalone\server.js",
    "$InstallDir\resources\.next\standalone\server.js",
    "$InstallDir\resources\app.asar.unpacked\.next\standalone\server.js"
)

$standaloneFound = $false
foreach ($path in $standalonePaths) {
    if (Test-Path $path) {
        Write-Host "✅ Found .next/standalone/server.js: $path"
        $standaloneFound = $true
        break
    }
}

if (-not $standaloneFound) {
    Write-Host "❌ .next/standalone/server.js NOT found in any expected location!"
    Write-Host "   The app will fail to launch without this file."
    Write-Host ""
    Write-Host "   Checked locations:"
    $standalonePaths | ForEach-Object { Write-Host "     - $_" }
}

# Check for app.asar
$asarPath = "$InstallDir\resources\app.asar"
if (Test-Path $asarPath) {
    Write-Host "✅ Found app.asar"
} else {
    Write-Host "⚠️  app.asar not found (may be in different location)"
}

# Summary
Write-Host ""
Write-Host "========================================="
if ($standaloneFound -and $exeFiles.Count -gt 0) {
    Write-Host "  ✅ INSTALLATION TEST PASSED"
    Write-Host "========================================="
    Write-Host ""
    Write-Host "To launch the application:"
    Write-Host "  Start-Process '$($exe.FullName)'"
    Write-Host ""
    Write-Host "To uninstall:"
    $uninstaller = Get-ChildItem -Path $InstallDir -Filter "*Uninstall*.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($uninstaller) {
        Write-Host "  Start-Process '$($uninstaller.FullName)' -ArgumentList '/S'"
    } else {
        Write-Host "  Remove-Item -Path '$InstallDir' -Recurse -Force"
    }
    exit 0
} else {
    Write-Host "  ❌ INSTALLATION TEST FAILED"
    Write-Host "========================================="
    exit 1
}

