#!/bin/bash
set -euo pipefail

cd /project

ELECTRON_VERSION="${ELECTRON_VERSION:-22.3.27}"
VERSION="${BUILD_VERSION:-1.0.0}"

echo ">>> Node $(node --version) | npm $(npm --version)"
echo ">>> Target: Electron ${ELECTRON_VERSION} (Win7 legacy) | version label: ${VERSION}"

echo ">>> Installing dependencies"
npm ci --legacy-peer-deps

echo ">>> Pinning legacy runtime deps (Electron ${ELECTRON_VERSION})"
npm install --no-save \
  electron@${ELECTRON_VERSION} \
  better-sqlite3@8.7.0 \
  keytar@7.9.0

echo ">>> Building Next.js (standalone)"
npm run build

if [ ! -f ".next/standalone/server.js" ]; then
  echo "ERROR: .next/standalone/server.js not found — build failed"
  exit 1
fi

echo ">>> Packaging Win7 legacy installer (Electron ${ELECTRON_VERSION})"
NODE_ENV=production \
BUILD_VERSION="win7-v${VERSION}" \
ELECTRON_VERSION="${ELECTRON_VERSION}" \
GH_TOKEN="" \
npx electron-builder \
  --win --x64 \
  --config electron-builder.config.cjs \
  --config.compression=store \
  --config.npmRebuild=false \
  "--config.win.artifactName=JK PosMan Setup ${VERSION}-win7-\${arch}.\${ext}" \
  --publish never

echo ">>> Verifying output"
exes=$(find dist-electron -maxdepth 1 -name "*-win7-*.exe" 2>/dev/null | sort)
if [ -z "$exes" ]; then
  echo "ERROR: No win7-labeled .exe found in dist-electron"
  exit 1
fi
echo "$exes" | while IFS= read -r exe; do
  size=$(du -m "$exe" | cut -f1)
  echo "  Built: $(basename "$exe")  (${size} MB)"
done

echo ">>> Copying installer to docker-build-electron/"
mkdir -p /project/docker-build-electron
find dist-electron -maxdepth 1 \( -name "*-win7-*.exe" -o -name "*-win7-*.exe.blockmap" \) | while IFS= read -r f; do
  cp "$f" /project/docker-build-electron/
  echo "  Copied: $(basename "$f")"
done

echo ">>> Done — installer is in docker-build-electron/"