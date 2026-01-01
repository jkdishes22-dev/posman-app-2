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

let buildCommand = "electron-builder";
if (platform !== "all") {
  buildCommand += ` --${platform}`;
}

try {
  execSync(buildCommand, {
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_ENV: "production",
    },
  });
  console.log("\n✅ Electron build completed successfully!");
  console.log("📦 Installers are in the dist-electron directory");
} catch (error) {
  console.error("❌ Electron build failed");
  process.exit(1);
}

