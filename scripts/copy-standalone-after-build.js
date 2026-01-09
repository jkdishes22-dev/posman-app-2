#!/usr/bin/env node

/**
 * Post-build script to copy .next/standalone directory to unpacked Electron app
 * This ensures the Next.js server files are accessible to utilityProcess
 * 
 * This script runs after electron-builder completes and manually copies
 * .next/standalone to the expected locations since extraFiles/extraResources
 * don't seem to be working reliably.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log("\n🔧 Post-build: Copying .next/standalone directory...\n");

// Find source .next/standalone
const projectRoot = process.cwd();
const sourceStandalone = path.join(projectRoot, ".next", "standalone");

if (!fs.existsSync(sourceStandalone)) {
  console.error(`❌ Source .next/standalone not found at: ${sourceStandalone}`);
  console.error("   Please ensure Next.js standalone build exists before running this script.");
  process.exit(1);
}

console.log(`✅ Source found: ${sourceStandalone}`);

// Check for server.js in source
const sourceServerJs = path.join(sourceStandalone, "server.js");
if (!fs.existsSync(sourceServerJs)) {
  console.error(`❌ server.js not found in source at: ${sourceServerJs}`);
  process.exit(1);
}

console.log(`✅ Source server.js exists: ${sourceServerJs}\n`);

// Find unpacked directories in both possible output locations
const possibleDistDirs = [
  path.join(projectRoot, "dist"),
  path.join(projectRoot, "dist-electron"),
];

const unpackedDirs = [];

for (const distDir of possibleDistDirs) {
  if (!fs.existsSync(distDir)) {
    console.log(`⚠️  Directory does not exist: ${distDir}`);
    continue;
  }

  try {
    const entries = fs.readdirSync(distDir, { withFileTypes: true });
    const found = entries
      .filter((entry) => entry.isDirectory() && entry.name.includes("unpacked"))
      .map((entry) => path.join(distDir, entry.name));

    if (found.length > 0) {
      console.log(`✅ Found unpacked directories in ${distDir}:`);
      found.forEach((dir) => console.log(`   - ${dir}`));
      unpackedDirs.push(...found);
    }
  } catch (error) {
    console.error(`❌ Error reading ${distDir}: ${error.message}`);
  }
}

if (unpackedDirs.length === 0) {
  console.error("❌ No unpacked directories found in dist/ or dist-electron/");
  console.error("   Please ensure electron-builder has completed successfully.");
  process.exit(1);
}

console.log(`\n📦 Processing ${unpackedDirs.length} unpacked directory(ies)...\n`);

// Copy to each unpacked directory
let successCount = 0;
let failCount = 0;

for (const unpackedDir of unpackedDirs) {
  console.log(`\n📁 Processing: ${unpackedDir}`);

  // Target locations
  const targetExtraFiles = path.join(unpackedDir, ".next", "standalone");
  const targetExtraResources = path.join(unpackedDir, "resources", ".next", "standalone");

  // Check if already exists
  const extraFilesExists = fs.existsSync(path.join(targetExtraFiles, "server.js"));
  const extraResourcesExists = fs.existsSync(path.join(targetExtraResources, "server.js"));

  if (extraFilesExists) {
    console.log(`   ✅ Already exists at: ${targetExtraFiles}`);
    successCount++;
    continue;
  }

  if (extraResourcesExists) {
    console.log(`   ✅ Already exists at: ${targetExtraResources}`);
    successCount++;
    continue;
  }

  // Copy to extraFiles location (app directory - same level as executable)
  console.log(`   📋 Copying to: ${targetExtraFiles}`);
  try {
    // Ensure target directory exists
    fs.mkdirSync(targetExtraFiles, { recursive: true });

    // Copy files recursively
    const copyRecursive = (src, dest) => {
      const entries = fs.readdirSync(src, { withFileTypes: true });
      let fileCount = 0;
      let dirCount = 0;

      for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
          fs.mkdirSync(destPath, { recursive: true });
          dirCount++;
          const subCounts = copyRecursive(srcPath, destPath);
          fileCount += subCounts.files;
          dirCount += subCounts.dirs;
        } else {
          fs.copyFileSync(srcPath, destPath);
          fileCount++;
        }
      }

      return { files: fileCount, dirs: dirCount };
    };

    const counts = copyRecursive(sourceStandalone, targetExtraFiles);
    console.log(`   ✅ Copied ${counts.files} files and ${counts.dirs} directories`);

    // Verify copy
    const verifyPath = path.join(targetExtraFiles, "server.js");
    if (fs.existsSync(verifyPath)) {
      console.log(`   ✅ Verification: server.js exists`);
      successCount++;
    } else {
      console.error(`   ❌ Verification failed: server.js not found`);
      failCount++;
    }
  } catch (error) {
    console.error(`   ❌ Copy failed: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
    failCount++;
  }
}

console.log(`\n${"=".repeat(60)}`);
if (failCount === 0) {
  console.log(`✅ Successfully processed ${successCount} unpacked directory(ies)`);
  console.log(`✅ .next/standalone is now accessible in all unpacked apps`);
  process.exit(0);
} else {
  console.error(`❌ Failed to copy to ${failCount} directory(ies)`);
  console.error(`✅ Succeeded in ${successCount} directory(ies)`);
  process.exit(1);
}

