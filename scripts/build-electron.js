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

// DB_MODE: "sqlite" | "mysql" — can be passed as env var or 3rd CLI arg
// e.g.  DB_MODE=sqlite node scripts/build-electron.js win
//        node scripts/build-electron.js win sqlite
// --publish flag triggers electron-builder --publish always (for GitHub Releases)
const args = process.argv.slice(2); // e.g. ["win", "--publish"] or ["win", "sqlite"]
const shouldPublish = args.includes("--publish");
const archArg = args.find((a) => a.startsWith("--arch="));
const targetArch = archArg ? archArg.split("=")[1] : "";
const nonFlagArgs = args.filter((a) => !a.startsWith("--"));
const dbMode = process.env.DB_MODE || nonFlagArgs[1] || "mysql";
console.log(`🗄️  Database mode: ${dbMode}\n`);
if (targetArch) {
  console.log(`🧱 Target architecture override: ${targetArch}\n`);
}

// Step 1: Build Next.js in standalone mode
console.log("📦 Step 1: Building Next.js in standalone mode...");
try {
  const nodeOptions = process.env.NODE_OPTIONS
    ? `${process.env.NODE_OPTIONS} --max-old-space-size=8192`
    : "--max-old-space-size=8192";
  execSync("npm run build", {
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_OPTIONS: nodeOptions,
      ELECTRON_BUILD: "true",
      NODE_ENV: "production",
      DB_MODE: dbMode,
    },
  });
  console.log("✅ Next.js build completed\n");
} catch (error) {
  console.error("❌ Next.js build failed");
  process.exit(1);
}

// Step 1.5: Copy public/ and .next/static into standalone so the Next.js server can serve them
console.log("📋 Copying static assets to standalone output...");
const standaloneDir = path.join(process.cwd(), ".next/standalone");
try {
  fs.cpSync(path.join(process.cwd(), "public"), path.join(standaloneDir, "public"), { recursive: true, force: true });
  fs.cpSync(path.join(process.cwd(), ".next/static"), path.join(standaloneDir, ".next/static"), { recursive: true, force: true });
  console.log("✅ Static assets copied to standalone\n");
} catch (err) {
  console.warn("⚠️  Warning: could not copy static assets:", err.message);
}

// Step 2: Verify standalone build exists
const standalonePath = path.join(process.cwd(), ".next/standalone");
if (!fs.existsSync(standalonePath)) {
  console.error("❌ Standalone build not found. Make sure Next.js output is set to \"standalone\"");
  process.exit(1);
}

// Step 2.5: Fix broken dependencies in @swagger-api packages
console.log("🔧 Fixing broken dependencies...");
try {
  execSync("node scripts/fix-swagger-deps.cjs", {
    stdio: "inherit",
    cwd: process.cwd(),
  });
} catch (error) {
  console.warn("⚠️  Warning: Could not fix dependencies (continuing anyway)");
}

// Step 3: Build Electron app
console.log("⚡ Step 2: Building Electron application...");
const platform = nonFlagArgs[0] || "all"; // 'win', 'mac', 'linux', or 'all'

const archLower = (targetArch || "").toLowerCase();
const envWinArch = (process.env.WIN_ARCH || "").toLowerCase();
const singleArchCli =
  archLower === "ia32" || archLower === "x64" || archLower === "arm64";
const dualWindowsNsis =
  platform === "win" &&
  !singleArchCli &&
  (archLower === "all" ||
    archLower === "both" ||
    archLower === "x64+ia32" ||
    archLower === "ia32+x64" ||
    envWinArch === "all" ||
    envWinArch === "both" ||
    envWinArch === "x64+ia32" ||
    envWinArch === "ia32+x64");

if (dualWindowsNsis) {
  console.log("🧱 Windows: dual NSIS (x64 + ia32) in one electron-builder run\n");
}

// Detect cross-compilation (building for different platform than current)
const currentPlatform = process.platform;
const isCrossCompilation =
  (platform === "win" && currentPlatform !== "win32") ||
  (platform === "mac" && currentPlatform !== "darwin") ||
  (platform === "linux" && currentPlatform !== "linux");

if (isCrossCompilation) {
  console.log("⚠️  Cross-compilation detected. Skipping native module rebuild...");
  console.log("   Note: For best results, build Windows packages on a Windows machine.");
  if (platform === "win") {
    console.log("   Native modules like keytar may fail if cross-compiled without valid prebuilds.");
    console.log("   Recommended: run Windows release builds on a Windows CI/host.");
  }
}

let buildCommand = "npx electron-builder --config electron-builder.config.cjs";
if (platform !== "all") {
  buildCommand += ` --${platform}`;
}
// Dual NSIS (x64 + ia32): arch list comes from electron-builder.config (WIN_ARCH=all); do not pass a single --arch.
if (!dualWindowsNsis && (targetArch === "ia32" || targetArch === "x64" || targetArch === "arm64")) {
  buildCommand += ` --${targetArch}`;
}

// Skip native module rebuilding for cross-compilation
// Use --config.npmRebuild=false to prevent electron-builder from rebuilding native modules
if (isCrossCompilation) {
  buildCommand += " --config.npmRebuild=false";
  console.log("   Using --config.npmRebuild=false to skip native module rebuilds");
}

// Publish to GitHub Releases when --publish flag is passed
if (shouldPublish) {
  buildCommand += " --publish always";
  console.log("   Publishing to GitHub Releases (requires GH_TOKEN env var)");
}

const buildEnv = {
  ...process.env,
  NODE_ENV: "production",
  DB_MODE: dbMode,
  ...(singleArchCli
    ? { WIN_ARCH: targetArch }
    : dualWindowsNsis
      ? { WIN_ARCH: "all" }
      : targetArch
        ? { WIN_ARCH: targetArch }
        : {}),
};

try {
  execSync(buildCommand, {
    stdio: "inherit",
    env: buildEnv,
  });
  console.log("\n✅ Electron build completed successfully!");
  console.log("📦 Installers are in the dist-electron directory");
  if (platform === "win") {
    let version = "";
    try {
      version = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8")).version || "";
    } catch {
      /* ignore */
    }
    if (dualWindowsNsis) {
      const v = version || "<version>";
      console.log("\n🪟 Windows NSIS (x64 + ia32) — two installers in dist-electron root:");
      console.log(`   dist-electron/JK PosMan Setup ${v}-x64.exe   (64-bit Electron)`);
      console.log(`   dist-electron/JK PosMan Setup ${v}-ia32.exe (32-bit / x86 Electron)`);
      console.log("   Unpacked: dist-electron/win-unpacked, dist-electron/win-ia32-unpacked");
    } else {
      const winArch = targetArch || "x64";
      const setupName = version
        ? `JK PosMan Setup ${version}-${winArch}.exe`
        : `JK PosMan Setup <version>-${winArch}.exe`;
      console.log(`\n🪟 Windows ${winArch} (x86 build = ia32, 64-bit PC = x64):`);
      console.log(`   NSIS: dist-electron/${setupName}`);
      console.log(
        `   Unpacked: dist-electron/${winArch === "ia32" ? "win-ia32-unpacked" : winArch === "arm64" ? "win-arm64-unpacked" : "win-unpacked"}`,
      );
    }
  }
  
  // Verify runtime standalone payload exists at the paths used by our packaging config/hooks.
  console.log("\n🔍 Verifying packaged standalone payload...");
  const distPath = path.join(process.cwd(), "dist-electron");
  const allUnpackedDirs = fs.readdirSync(distPath, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory() && dirent.name.includes("unpacked"))
    .map(dirent => path.join(distPath, dirent.name));

  const expectedDirNameByTarget = {
    ia32: "win-ia32-unpacked",
    arm64: "win-arm64-unpacked",
    x64: "win-unpacked",
  };
  let unpackedDirs = allUnpackedDirs;
  if (platform === "win") {
    if (dualWindowsNsis) {
      unpackedDirs = allUnpackedDirs.filter((dirPath) => {
        const b = path.basename(dirPath);
        return b === "win-unpacked" || b === "win-ia32-unpacked";
      });
      if (unpackedDirs.length < 2) {
        console.warn("⚠️  WARNING: Expected both win-unpacked and win-ia32-unpacked for dual NSIS build.");
        console.warn("   Falling back to scanning all unpacked directories.");
        unpackedDirs = allUnpackedDirs;
      }
    } else {
      const expectedWinDir = expectedDirNameByTarget[targetArch || "x64"] || "win-unpacked";
      unpackedDirs = allUnpackedDirs.filter((dirPath) => path.basename(dirPath) === expectedWinDir);
      if (unpackedDirs.length === 0) {
        console.warn(`⚠️  WARNING: Expected Windows unpacked output not found: ${expectedWinDir}`);
        console.warn("   Falling back to scanning all unpacked directories.");
        unpackedDirs = allUnpackedDirs;
      }
    }
  }

  const dirsToVerify = unpackedDirs;
  
  for (const unpackedDir of dirsToVerify) {
    const candidates = [
      path.join(unpackedDir, "resources", ".next", "standalone"),
      path.join(unpackedDir, "resources", "app.asar.unpacked", ".next", "standalone"),
      path.join(unpackedDir, ".next", "standalone"),
    ];
    const resolved = candidates.find((candidate) =>
      fs.existsSync(path.join(candidate, "server.js"))
    );

    if (resolved) {
      const hasNodeModules = fs.existsSync(path.join(resolved, "node_modules"));
      console.log(`✅ Found standalone payload in: ${resolved}`);
      if (!hasNodeModules) {
        console.warn(`⚠️  WARNING: node_modules missing in standalone payload: ${resolved}`);
      }
    } else {
      console.warn(`⚠️  WARNING: standalone server.js not found for: ${unpackedDir}`);
      console.warn("   This may cause the app to fail to start. Check extraResources/afterPack output.");
    }
  }
} catch (error) {
  console.error("❌ Electron build failed");
  if (isCrossCompilation) {
    console.error("\n💡 Tip: Cross-compilation can be problematic with native modules.");
    console.error("   Consider building on a Windows machine for best results.");
    console.error("   Ensure keytar/better-sqlite3 Electron prebuilds are successfully patched in afterPack.");
  }
  process.exit(1);
}

