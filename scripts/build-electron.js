#!/usr/bin/env node

/**
 * Build script for Electron desktop application
 * This script:
 * 1. Builds Next.js in standalone mode
 * 2. Builds Electron app with electron-builder
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log("🚀 Starting Electron build process...\n");

// Step 1: Build Next.js in standalone mode
console.log("📦 Step 1: Building Next.js in standalone mode...");
try {
  execSync("npm run build", {
    stdio: "inherit",
    env: {
      ...process.env,
      ELECTRON_BUILD: "true",
      NODE_ENV: "production",
    },
  });
  console.log("✅ Next.js build completed\n");
} catch (error) {
  console.error("❌ Next.js build failed");
  process.exit(1);
}

// Step 2: Verify standalone build exists
const standalonePath = path.join(process.cwd(), ".next/standalone");
if (!fs.existsSync(standalonePath)) {
  console.error("❌ Standalone build not found. Make sure Next.js output is set to \"standalone\"");
  process.exit(1);
}

// Step 3: Build Electron app
console.log("⚡ Step 2: Building Electron application...");
const platform = process.argv[2] || "all"; // 'win', 'mac', 'linux', or 'all'

// Detect cross-compilation (building for different platform than current)
const currentPlatform = process.platform;
const isCrossCompilation =
  (platform === "win" && currentPlatform !== "win32") ||
  (platform === "mac" && currentPlatform !== "darwin") ||
  (platform === "linux" && currentPlatform !== "linux");

if (isCrossCompilation) {
  console.log("⚠️  Cross-compilation detected. Skipping native module rebuild...");
  console.log("   Note: For best results, build Windows packages on a Windows machine.");
}

let buildCommand = "npx electron-builder";
if (platform !== "all") {
  buildCommand += ` --${platform}`;
}

// Skip native module rebuilding for cross-compilation
// Use --config.npmRebuild=false to prevent electron-builder from rebuilding native modules
if (isCrossCompilation) {
  buildCommand += " --config.npmRebuild=false";
  console.log("   Using --config.npmRebuild=false to skip native module rebuilds");
}

const buildEnv = {
  ...process.env,
  NODE_ENV: "production",
};

try {
  execSync(buildCommand, {
    stdio: "inherit",
    env: buildEnv,
  });
  console.log("\n✅ Electron build completed successfully!");
  console.log("📦 Installers are in the dist-electron directory");
} catch (error) {
  console.error("❌ Electron build failed");
  if (isCrossCompilation) {
    console.error("\n💡 Tip: Cross-compilation can be problematic with native modules.");
    console.error("   Consider building on a Windows machine for best results.");
    console.error("   Or try: SKIP_REBUILD=true node scripts/build-electron.js win");
  }
  process.exit(1);
}

