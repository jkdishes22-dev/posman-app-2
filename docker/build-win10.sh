#!/bin/bash
set -euo pipefail

cd /project

echo ">>> Node $(node --version) | npm $(npm --version)"

echo ">>> Installing dependencies"
npm ci --legacy-peer-deps

echo ">>> Building Next.js (standalone)"
npm run build

if [ ! -f ".next/standalone/server.js" ]; then
  echo "ERROR: .next/standalone/server.js not found — build failed"
  exit 1
fi

echo ">>> Packaging Windows installer (Electron 39 / Win10-11 target)"
NODE_ENV=production \
BUILD_VERSION="${BUILD_VERSION:-1.0.0}" \
GH_TOKEN="" \
npx electron-builder \
  --win --x64 \
  --config electron-builder.config.cjs \
  --config.compression=store \
  --config.npmRebuild=false \
  --publish never

echo ">>> Verifying output"
exes=$(find dist-electron -maxdepth 1 -name "*.exe" 2>/dev/null | sort)
if [ -z "$exes" ]; then
  echo "ERROR: No .exe found in dist-electron"
  exit 1
fi
echo "$exes" | while IFS= read -r exe; do
  size=$(du -m "$exe" | cut -f1)
  echo "  Built: $(basename "$exe")  (${size} MB)"
done

echo ">>> Copying installer to docker-build-electron/"
mkdir -p /project/docker-build-electron
find dist-electron -maxdepth 1 \( -name "*.exe" -o -name "*.exe.blockmap" \) | while IFS= read -r f; do
  cp "$f" /project/docker-build-electron/
  echo "  Copied: $(basename "$f")"
done

echo ">>> Done — installer is in docker-build-electron/"