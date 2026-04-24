const fs = require("fs");
const path = require("path");

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
