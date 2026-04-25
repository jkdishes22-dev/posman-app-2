const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const os = require("os");

/**
 * Downloads the Windows-native better_sqlite3.node prebuilt and replaces the macOS one.
 * Required when cross-compiling from macOS → Windows because afterPackHook copies the
 * macOS arm64/x64 binary verbatim, which is not a valid Win32 application.
 */
async function replaceWindowsSqliteBinary(context, destNodeModules, projectRoot, log, err) {
    if (context.electronPlatformName !== "win32") return;

    const archMap = { 0: "ia32", 1: "x64", 2: "armv7l", 3: "arm64", 4: "x64" };
    const arch = archMap[context.arch] ?? "x64";

    const bsq3PkgPath = path.join(destNodeModules, "better-sqlite3", "package.json");
    if (!fs.existsSync(bsq3PkgPath)) {
        log("   ℹ️  better-sqlite3 not in dest node_modules — skipping binary replacement");
        return;
    }
    const bsq3Version = JSON.parse(fs.readFileSync(bsq3PkgPath, "utf8")).version;

    // Look up the Electron → ABI mapping from node-abi (ships with prebuild-install)
    let abi = "140"; // safe fallback for Electron 39
    try {
        const abiRegistryPath = path.join(projectRoot, "node_modules", "node-abi", "abi_registry.json");
        if (fs.existsSync(abiRegistryPath)) {
            const registry = JSON.parse(fs.readFileSync(abiRegistryPath, "utf8"));
            const electronVersion = context.packager?.electronVersion ?? "";
            const major = electronVersion.split(".")[0];
            const entry = registry.find(
                (e) => e.runtime === "electron" && e.target.startsWith(major + ".")
            );
            if (entry) abi = entry.abi;
        }
    } catch { /* keep default */ }

    const tarUrl = `https://github.com/WiseLibs/better-sqlite3/releases/download/v${bsq3Version}/better-sqlite3-v${bsq3Version}-electron-${abi}-win32-${arch}.tar.gz`;
    log(`\n   🔄 Replacing macOS better_sqlite3.node with Windows (${arch}) version...`);
    log(`   📥 URL: ${tarUrl}`);

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "bsq3-win-"));
    const tarPath = path.join(tmpDir, "archive.tar.gz");

    try {
        execSync(`curl -L --fail -o "${tarPath}" "${tarUrl}"`, { stdio: "pipe" });
        execSync(`tar xzf "${tarPath}" -C "${tmpDir}"`);

        const extractedBinary = path.join(tmpDir, "build", "Release", "better_sqlite3.node");
        if (!fs.existsSync(extractedBinary)) {
            err(`   ❌ Expected binary not found after extraction: ${extractedBinary}`);
            return;
        }

        const destBinaryPath = path.join(
            destNodeModules, "better-sqlite3", "build", "Release", "better_sqlite3.node"
        );
        fs.mkdirSync(path.dirname(destBinaryPath), { recursive: true });
        fs.copyFileSync(extractedBinary, destBinaryPath);
        log(`   ✅ Windows better_sqlite3.node installed: ${destBinaryPath}`);
    } catch (e) {
        err(`   ❌ Binary replacement failed: ${e.message}`);
        err(`   💡 Check the release exists: ${tarUrl}`);
    } finally {
        try { execSync(`rm -rf "${tmpDir}"`); } catch { /* ignore cleanup errors */ }
    }
}

/**
 * afterPack hook for electron-builder
 * Ensures .next/standalone (including node_modules) is fully copied to the packaged app.
 * electron-builder's extraResources filter copies server.js but skips node_modules by default.
 * This hook detects that and fills in the gap.
 */
module.exports = async function (context) {
    const log = (msg) => { process.stdout.write(`${msg}\n`); console.log(msg); };
    const err = (msg) => { process.stderr.write(`${msg}\n`); console.error(msg); };

    log("\n🔧 afterPack hook executing...");
    log(`   appOutDir: ${context.appOutDir || "NOT SET"}`);
    log(`   electronPlatformName: ${context.electronPlatformName || "NOT SET"}`);
    log(`   arch: ${context.arch || "NOT SET"}`);

    const projectDir = context.packager?.info?.projectDir || context.appDir || process.cwd();
    const sourceStandalone = path.join(projectDir, ".next", "standalone");
    const sourceNodeModules = path.join(sourceStandalone, "node_modules");

    log(`   Source standalone: ${sourceStandalone}`);
    log(`   Source exists: ${fs.existsSync(sourceStandalone)}`);
    log(`   Source node_modules exists: ${fs.existsSync(sourceNodeModules)}`);

    if (!fs.existsSync(sourceStandalone)) {
        err(`❌ Source .next/standalone not found at: ${sourceStandalone}`);
        return;
    }

    // Recursive copy helper - only copies missing files (does not overwrite)
    const copyDir = (src, dest) => {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        const entries = fs.readdirSync(src, { withFileTypes: true });
        let files = 0, dirs = 0;
        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);
            if (entry.isDirectory()) {
                dirs++;
                const sub = copyDir(srcPath, destPath);
                files += sub.files; dirs += sub.dirs;
            } else if (!fs.existsSync(destPath)) {
                fs.copyFileSync(srcPath, destPath);
                files++;
            }
        }
        return { files, dirs };
    };

    const appOutDir = context.appOutDir;
    if (!appOutDir || !fs.existsSync(appOutDir)) {
        err(`❌ appOutDir not found: ${appOutDir}`);
        return;
    }

    // Possible locations electron-builder may have placed .next/standalone
    const candidates = [
        { label: "extraResources", path: path.join(appOutDir, "resources", ".next", "standalone") },
        { label: "asarUnpack",     path: path.join(appOutDir, "resources", "app.asar.unpacked", ".next", "standalone") },
        { label: "extraFiles",     path: path.join(appOutDir, ".next", "standalone") },
    ];

    let handledAny = false;

    for (const candidate of candidates) {
        const hasServerJs = fs.existsSync(path.join(candidate.path, "server.js"));
        const hasNodeModules = fs.existsSync(path.join(candidate.path, "node_modules"));

        if (!hasServerJs && !hasNodeModules) {
            log(`   Skipping ${candidate.label} (standalone not present)`);
            continue;
        }

        log(`\n   Found standalone at ${candidate.label}: ${candidate.path}`);
        log(`   server.js present: ${hasServerJs}`);
        log(`   node_modules present: ${hasNodeModules}`);

        if (!hasServerJs) {
            // Partial copy — fill in everything
            log(`   ⚠️ server.js missing, doing full copy...`);
            const counts = copyDir(sourceStandalone, candidate.path);
            log(`   ✅ Full copy: ${counts.files} files, ${counts.dirs} dirs`);
            handledAny = true;
            continue;
        }

        if (!hasNodeModules && fs.existsSync(sourceNodeModules)) {
            // electron-builder skipped node_modules — copy it now
            log(`   ⚠️ node_modules missing (electron-builder excluded it) — copying now...`);
            const targetNm = path.join(candidate.path, "node_modules");
            const counts = copyDir(sourceNodeModules, targetNm);
            log(`   ✅ node_modules copied: ${counts.files} files, ${counts.dirs} dirs`);
            handledAny = true;
        } else if (hasNodeModules) {
            log(`   ✅ standalone complete (server.js + node_modules present)`);
            handledAny = true;
        } else {
            log(`   ⚠️ server.js present but no source node_modules to copy`);
            handledAny = true;
        }
    }

    if (!handledAny) {
        // Nothing was placed by electron-builder — do full copy to extraResources location
        const targetExtraResources = path.join(appOutDir, "resources", ".next", "standalone");
        log(`\n   ⚠️ No standalone found in any candidate path — manually copying to extraResources...`);
        const counts = copyDir(sourceStandalone, targetExtraResources);
        log(`   ✅ Full copy: ${counts.files} files, ${counts.dirs} dirs`);
        handledAny = true;
    }

    // For Windows builds: replace the macOS better_sqlite3.node with the Win32 prebuilt.
    // We do this after all copying so the replacement always wins.
    if (context.electronPlatformName === "win32") {
        const destNm = path.join(candidates[0].path, "node_modules");
        if (fs.existsSync(destNm)) {
            await replaceWindowsSqliteBinary(context, destNm, projectDir, log, err);
        } else {
            log("   ℹ️  node_modules not yet in dest — skipping Windows binary replacement");
        }
    }

    // Final verification
    const verify = candidates[0]; // extraResources is what main.cjs prefers
    const ok = fs.existsSync(path.join(verify.path, "server.js")) &&
               fs.existsSync(path.join(verify.path, "node_modules"));
    if (ok) {
        log(`\n✅ afterPack hook completed — standalone ready at: ${verify.path}`);
    } else {
        err(`\n⚠️ afterPack hook completed — verification incomplete at: ${verify.path}`);
    }
};
