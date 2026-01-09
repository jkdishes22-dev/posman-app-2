const fs = require("fs");
const path = require("path");

/**
 * afterPack hook for electron-builder
 * This hook runs AFTER the app is packaged but BEFORE the installer is created
 * It copies .next/standalone to the unpacked directory so it's included in the installer
 */
module.exports = async function (context) {
    // Force output to stdout/stderr (electron-builder might suppress console.log)
    process.stdout.write("\n🔧 afterPack hook executing (from separate file)...\n");
    process.stdout.write(`   appOutDir: ${context.appOutDir || "NOT SET"}\n`);
    process.stdout.write(`   outDir: ${context.outDir || "NOT SET"}\n`);
    process.stdout.write(`   appDir: ${context.appDir || "NOT SET"}\n`);
    process.stdout.write(`   electronPlatformName: ${context.electronPlatformName || "NOT SET"}\n`);
    process.stdout.write(`   arch: ${context.arch || "NOT SET"}\n`);

    // Also log to console for visibility
    console.log("\n🔧 afterPack hook executing (from separate file)...");
    console.log(`   appOutDir: ${context.appOutDir || "NOT SET"}`);
    console.log(`   outDir: ${context.outDir || "NOT SET"}`);
    console.log(`   appDir: ${context.appDir || "NOT SET"}`);

    // Try multiple possible output directory locations
    // Get project directory from context or fallback to cwd
    const projectDir = context.packager?.info?.projectDir || context.appDir || process.cwd();

    const possibleOutDirs = [
        context.appOutDir,
        context.outDir,
        path.join(process.cwd(), "dist", "win-unpacked"),
        path.join(process.cwd(), "dist", "win-x64-unpacked"),
        path.join(process.cwd(), "dist-electron", "win-unpacked"),
        path.join(process.cwd(), "dist-electron", "win-x64-unpacked"),
    ].filter(Boolean);

    // Source path should be relative to project root
    const sourceStandalone = path.join(projectDir, ".next", "standalone");
    process.stdout.write(`   Source standalone: ${sourceStandalone}\n`);
    process.stdout.write(`   Source exists: ${fs.existsSync(sourceStandalone)}\n`);
    console.log(`   Source standalone: ${sourceStandalone}`);
    console.log(`   Source exists: ${fs.existsSync(sourceStandalone)}`);

    if (!fs.existsSync(sourceStandalone)) {
        console.error(`❌ Source .next/standalone not found at: ${sourceStandalone}`);
        return;
    }

    // Try to copy to each possible output directory
    let copied = false;
    for (const appOutDir of possibleOutDirs) {
        if (!appOutDir || !fs.existsSync(appOutDir)) {
            process.stdout.write(`   Skipping ${appOutDir} (does not exist)\n`);
            console.log(`   Skipping ${appOutDir} (does not exist)`);
            continue;
        }

        process.stdout.write(`\n   Processing output directory: ${appOutDir}\n`);
        console.log(`\n   Processing output directory: ${appOutDir}`);

        const targetExtraFiles = path.join(appOutDir, ".next", "standalone");
        const targetExtraResources = path.join(appOutDir, "resources", ".next", "standalone");

        // Check if already copied
        const extraFilesExists = fs.existsSync(path.join(targetExtraFiles, "server.js"));
        const extraResourcesExists = fs.existsSync(path.join(targetExtraResources, "server.js"));

        if (extraFilesExists) {
            process.stdout.write(`   ✅ .next/standalone already exists via extraFiles at: ${targetExtraFiles}\n`);
            console.log(`   ✅ .next/standalone already exists via extraFiles at: ${targetExtraFiles}`);
            copied = true;
            continue;
        }
        if (extraResourcesExists) {
            process.stdout.write(`   ✅ .next/standalone already exists via extraResources at: ${targetExtraResources}\n`);
            console.log(`   ✅ .next/standalone already exists via extraResources at: ${targetExtraResources}`);
            copied = true;
            continue;
        }
        if (asarUnpackExists) {
            process.stdout.write(`   ✅ .next/standalone already exists via asarUnpack at: ${targetAsarUnpack}\n`);
            console.log(`   ✅ .next/standalone already exists via asarUnpack at: ${targetAsarUnpack}`);
            copied = true;
            continue;
        }

        // Manual copy to extraFiles location (app directory) - this is where the executable is
        process.stdout.write(`   ⚠️ .next/standalone not found, manually copying to: ${targetExtraFiles}\n`);
        console.log(`   ⚠️ .next/standalone not found, manually copying to: ${targetExtraFiles}`);
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
            process.stdout.write(`   ✅ Copied ${counts.files} files and ${counts.dirs} directories\n`);
            console.log(`   ✅ Copied ${counts.files} files and ${counts.dirs} directories`);

            // Verify copy
            const verifyPath = path.join(targetExtraFiles, "server.js");
            if (fs.existsSync(verifyPath)) {
                process.stdout.write(`   ✅ Verification: server.js exists at: ${verifyPath}\n`);
                console.log(`   ✅ Verification: server.js exists at: ${verifyPath}`);
                copied = true;
            } else {
                process.stderr.write(`   ❌ Verification failed: server.js not found at: ${verifyPath}\n`);
                console.error(`   ❌ Verification failed: server.js not found at: ${verifyPath}`);
            }
        } catch (error) {
            process.stderr.write(`   ❌ Failed to copy: ${error.message}\n`);
            process.stderr.write(`   Stack: ${error.stack}\n`);
            console.error(`   ❌ Failed to copy: ${error.message}`);
            console.error(`   Stack: ${error.stack}`);
        }
    }

    if (copied) {
        process.stdout.write(`\n✅ afterPack hook completed - files copied successfully\n`);
        console.log(`\n✅ afterPack hook completed - files copied successfully\n`);
    } else {
        process.stderr.write(`\n⚠️ afterPack hook completed - no files were copied\n`);
        console.error(`\n⚠️ afterPack hook completed - no files were copied\n`);
    }
};

