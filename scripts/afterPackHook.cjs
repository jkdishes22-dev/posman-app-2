const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const os = require("os");

/** electron-builder may pass arch as a number (enum) or string; WIN_ARCH must match electron-builder.config.cjs. */
function resolveTargetArch(context) {
    const winArchEnv = (process.env.WIN_ARCH || "").toLowerCase();
    const winArchMulti =
        winArchEnv === "all" ||
        winArchEnv === "both" ||
        winArchEnv === "x64+ia32" ||
        winArchEnv === "ia32+x64";
    if (!winArchMulti) {
        if (winArchEnv === "ia32" || winArchEnv === "x86") return "ia32";
        if (winArchEnv === "x64" || winArchEnv === "amd64") return "x64";
        if (winArchEnv === "arm64") return "arm64";
    }

    const raw = context.arch;
    if (typeof raw === "string") {
        const lower = raw.toLowerCase();
        if (lower === "ia32" || lower === "x86" || lower === "i386") return "ia32";
        if (lower === "arm64") return "arm64";
        if (lower === "x64" || lower === "amd64" || lower === "x86_64") return "x64";
        return "x64";
    }
    const archMap = { 0: "ia32", 1: "x64", 2: "armv7l", 3: "arm64", 4: "x64" };
    return archMap[raw] ?? "x64";
}

const PE_MACHINE_I386 = 0x014c;
const PE_MACHINE_AMD64 = 0x8664;
const PE_MACHINE_ARM64 = 0xaa64;

function readPeMachine(binaryPath) {
    if (!fs.existsSync(binaryPath)) return null;
    try {
        const fd = fs.openSync(binaryPath, "r");
        try {
            const mz = Buffer.alloc(2);
            fs.readSync(fd, mz, 0, 2, 0);
            if (mz[0] !== 0x4d || mz[1] !== 0x5a) return null;
            const peOffBuf = Buffer.alloc(4);
            fs.readSync(fd, peOffBuf, 0, 4, 0x3c);
            const peOffset = peOffBuf.readUInt32LE(0);
            const machine = Buffer.alloc(2);
            fs.readSync(fd, machine, 0, 2, peOffset + 4);
            return machine.readUInt16LE(0);
        } finally {
            fs.closeSync(fd);
        }
    } catch {
        return null;
    }
}

function peMachineMatchesTargetArch(machine, targetArch) {
    if (machine == null) return false;
    if (targetArch === "ia32") return machine === PE_MACHINE_I386;
    if (targetArch === "x64") return machine === PE_MACHINE_AMD64;
    if (targetArch === "arm64") return machine === PE_MACHINE_ARM64;
    return false;
}

/**
 * Downloads the Windows-native better_sqlite3.node prebuilt and replaces the macOS one.
 * Required when cross-compiling from macOS → Windows because the afterPack copy brings
 * the macOS arm64/x64 binary verbatim, which is not a valid Win32 application.
 */
async function replaceWindowsSqliteBinary(context, destNodeModules, projectRoot, log, err) {
    if (context.electronPlatformName !== "win32") return;

    const arch = resolveTargetArch(context);

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

    const tarUrl = `https://github.com/WiseLibs/better-sqlite3/releases/download/v${bsq3Version}/better-sqlite3-v${bsq3Version}-electron-v${abi}-win32-${arch}.tar.gz`;
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
        try {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        } catch {
            /* ignore */
        }
    }
}

function hasWindowsPeHeader(binaryPath) {
    if (!fs.existsSync(binaryPath)) return false;
    try {
        const fd = fs.openSync(binaryPath, "r");
        const buf = Buffer.alloc(2);
        fs.readSync(fd, buf, 0, 2, 0);
        fs.closeSync(fd);
        return buf[0] === 0x4d && buf[1] === 0x5a; // "MZ"
    } catch {
        return false;
    }
}

async function replaceWindowsKeytarBinary(context, destNodeModules, log, err) {
    if (context.electronPlatformName !== "win32") return;

    const arch = resolveTargetArch(context);
    let electronVersion = context.packager?.electronVersion ?? "";
    const keytarDir = path.join(destNodeModules, "keytar");
    const keytarPkgPath = path.join(keytarDir, "package.json");
    const keytarBinaryPath = path.join(
        keytarDir,
        "build",
        "Release",
        "keytar.node",
    );

    if (!fs.existsSync(keytarPkgPath)) {
        log("   ℹ️  keytar not in dest node_modules — skipping keytar binary replacement");
        return;
    }

    const machine = readPeMachine(keytarBinaryPath);
    if (machine != null && peMachineMatchesTargetArch(machine, arch)) {
        log(`   ✅ keytar binary already matches target arch (${arch}): ${keytarBinaryPath}`);
        return;
    }
    if (machine != null && !peMachineMatchesTargetArch(machine, arch)) {
        log(`   ⚠️ keytar.node PE machine 0x${machine.toString(16)} does not match target ${arch} — rebuilding...`);
    }

    if (!electronVersion) {
        try {
            const electronPkgPath = path.join(process.cwd(), "node_modules", "electron", "package.json");
            if (fs.existsSync(electronPkgPath)) {
                electronVersion = JSON.parse(fs.readFileSync(electronPkgPath, "utf8")).version || "";
            }
        } catch {
            // fallback handled below
        }
    }

    if (!electronVersion) {
        throw new Error(
            "Electron version missing in afterPack context and local electron package; cannot resolve keytar prebuild.",
        );
    }

    log(`\n   🔄 Replacing keytar.node with Windows Electron prebuild (${arch}, electron ${electronVersion})...`);
    let prebuildOk = false;
    try {
        execSync(
            `npx --yes prebuild-install --runtime electron --target ${electronVersion} --arch ${arch} --platform win32`,
            { cwd: keytarDir, stdio: "pipe" },
        );
        prebuildOk = true;
    } catch (e) {
        err(`   ⚠️ keytar prebuild-install failed: ${e.message}`);
    }

    if (!hasWindowsPeHeader(keytarBinaryPath)) {
        err(
            `   ⚠️ keytar binary replacement unavailable. Expected Windows PE binary at ${keytarBinaryPath}`,
        );
        err("   ⚠️ Continuing build; runtime will gracefully report secure storage as unavailable.");
        return;
    }
    const afterMachine = readPeMachine(keytarBinaryPath);
    if (!peMachineMatchesTargetArch(afterMachine, arch)) {
        err(
            `   ⚠️ keytar.node does not match target arch ${arch} (PE machine 0x${(afterMachine ?? 0).toString(16)}): ${keytarBinaryPath}`,
        );
        err("   ⚠️ Continuing build; runtime will gracefully report secure storage as unavailable.");
        return;
    }

    if (!prebuildOk) {
        log(`   ✅ keytar.node already valid for target arch (${arch}): ${keytarBinaryPath}`);
        return;
    }
    log(`   ✅ Windows keytar.node installed: ${keytarBinaryPath}`);
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
    log(`   arch (raw): ${context.arch ?? "NOT SET"}  → resolved: ${resolveTargetArch(context)}`);

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

    // Copy .next/static into each resolved standalone dir so the server can serve assets.
    // Next.js standalone server expects static files at {cwd}/.next/static — without this all
    // _next/static/* requests return 404.
    const sourceStatic = path.join(projectDir, ".next", "static");
    if (fs.existsSync(sourceStatic)) {
        for (const candidate of candidates) {
            const hasServerJs = fs.existsSync(path.join(candidate.path, "server.js"));
            if (!hasServerJs) continue;
            const targetStatic = path.join(candidate.path, ".next", "static");
            if (!fs.existsSync(targetStatic)) {
                log(`\n   Copying .next/static → ${targetStatic}`);
                const counts = copyDir(sourceStatic, targetStatic);
                log(`   ✅ .next/static copied: ${counts.files} files, ${counts.dirs} dirs`);
            } else {
                log(`\n   ✅ .next/static already present at ${targetStatic}`);
            }
        }
    } else {
        err(`⚠️ Source .next/static not found at: ${sourceStatic}`);
    }

    if (!handledAny) {
        // Nothing was placed by electron-builder — do full copy to extraResources location
        const targetExtraResources = path.join(appOutDir, "resources", ".next", "standalone");
        log(`\n   ⚠️ No standalone found in any candidate path — manually copying to extraResources...`);
        const counts = copyDir(sourceStandalone, targetExtraResources);
        log(`   ✅ Full copy: ${counts.files} files, ${counts.dirs} dirs`);
        handledAny = true;
    }

    // For Windows builds: replace native .node binaries for the *packager* CPU arch.
    // Must run after the node_modules copy so the replacement always wins.
    if (context.electronPlatformName === "win32") {
        for (const candidate of candidates) {
            const standaloneRoot = candidate.path;
            const destNm = path.join(standaloneRoot, "node_modules");
            const hasServer = fs.existsSync(path.join(standaloneRoot, "server.js"));
            if (!hasServer || !fs.existsSync(destNm)) continue;
            log(`\n   🪟 Windows native modules (${candidate.label}) → ${standaloneRoot}`);
            await replaceWindowsSqliteBinary(context, destNm, projectDir, log, err);
            await replaceWindowsKeytarBinary(context, destNm, log, err);
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
