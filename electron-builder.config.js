const path = require("path");

// Detect if we're cross-compiling (building for different platform than current)
// This helps skip native module rebuilding which doesn't work for cross-compilation
const isCrossCompiling = (targetPlatform) => {
  const currentPlatform = process.platform;
  return (
    (targetPlatform === "win" && currentPlatform !== "win32") ||
    (targetPlatform === "mac" && currentPlatform !== "darwin") ||
    (targetPlatform === "linux" && currentPlatform !== "linux")
  );
};

module.exports = {
  appId: "com.jk.posman",
  productName: "JK PosMan",
  copyright: "Copyright © 2024 JK PosMan",

  // Ensure icon is set at root level for all platforms
  icon: "public/icons/JKlogo-512.png", // electron-builder will convert to platform-specific format

  directories: {
    output: "dist-electron",
    buildResources: "build",
  },

  files: [
    "electron/**/*",
    // NOTE: .next/standalone is NOT included in files array because we use extraResources
    // to copy it outside ASAR. Including it here would pack it into ASAR, making it
    // inaccessible to utilityProcess.
    ".next/static/**/*",
    "public/**/*",
    "package.json",
    "node_modules/**/*",
    // Exclude problematic native modules that can't be cross-compiled
    "!node_modules/**/tree-sitter*/**",
    "!node_modules/**/@swagger-api/**",
    "!node_modules/**/swagger-ui-react/**",
    "!node_modules/**/@tree-sitter-grammars/**",
  ],

  // Exclude problematic packages from dependency analysis
  asar: true,
  nodeGypRebuild: false,

  // Unpack .next/standalone directory from ASAR archive
  // This is necessary for utilityProcess to access the Next.js server files
  // Files will be extracted to resources/app.asar.unpacked/.next/standalone
  // Patterns must match files as they appear INSIDE the ASAR archive
  asarUnpack: [
    "**/.next/standalone/**",
    "**/.next/standalone/**/*",
    ".next/standalone/**",
    ".next/standalone/**/*",
  ],

  // Use extraResources to copy .next/standalone to resources/ directory
  // This is more reliable than extraFiles and places files at resources/.next/standalone
  // extraResources copies to resources/ (same level as app.asar), bypassing ASAR entirely
  // Using object format with explicit filter to ensure all files are copied
  extraResources: [
    {
      from: ".next/standalone",
      to: ".next/standalone",
      filter: ["**/*"],
    },
  ],

  // Use extraFiles to copy .next/standalone to app directory (same level as executable)
  // This is a fallback if extraResources doesn't work
  // extraFiles copies to the app directory (where JK PosMan.exe is), not resources/
  extraFiles: [
    {
      from: "public/icons",
      to: "public/icons",
      filter: ["**/*"],
    },
    {
      from: ".next/standalone",
      to: ".next/standalone",
      filter: ["**/*"],
    },
  ],

  // Windows configuration
  win: {
    target: [
      {
        target: "nsis",
        arch: ["x64", "ia32"],
      },
      {
        target: "portable",
        arch: ["x64"],
      },
    ],
    // Windows needs .ico format
    // electron-builder will automatically convert PNG to ICO if ICO doesn't exist
    // For best results, create JKlogo-512.ico manually (see scripts/create-windows-icon.md)
    icon: "public/icons/JKlogo-512.png", // Will be auto-converted to .ico during build
    publisherName: "JK PosMan",
    requestedExecutionLevel: "asInvoker",
    // Windows 7, 10, 11 compatibility
    // Electron 27+ requires Windows 10+, but we can set minimum version
    // For Windows 7 support, you may need to use an older Electron version
    // For now, we'll target Windows 10+ (which includes Windows 11)
    // Windows 7 users would need an older build with Electron < 20
    signAndEditExecutable: false, // Set to true if you have code signing certificate
  },

  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: "JK PosMan",
    runAfterFinish: true, // Launch app after installation completes
    // electron-builder will convert PNG to ICO automatically
    installerIcon: "public/icons/JKlogo-512.png", // Will be converted to .ico automatically
    uninstallerIcon: "public/icons/JKlogo-512.png",
    installerHeaderIcon: "public/icons/JKlogo-512.png",
    include: "build/installer.nsh",
    license: "LICENSE",
    menuCategory: "Business",
    // Additional NSIS options for better compatibility
    perMachine: false, // Install for current user only (better for Windows 7/10 compatibility)
    deleteAppDataOnUninstall: false, // Keep user data on uninstall
  },

  // macOS configuration
  mac: {
    target: [
      {
        target: "dmg",
        arch: ["x64", "arm64"],
      },
      {
        target: "zip",
        arch: ["x64", "arm64"],
      },
    ],
    icon: "public/icons/JKlogo-512.png",
    category: "public.app-category.business",
    hardenedRuntime: true,
    gatekeeperAssess: false,
    entitlements: "build/entitlements.mac.plist",
    entitlementsInherit: "build/entitlements.mac.plist",
  },

  dmg: {
    contents: [
      {
        x: 410,
        y: 150,
        type: "link",
        path: "/Applications",
      },
      {
        x: 130,
        y: 150,
        type: "file",
      },
    ],
    window: {
      width: 540,
      height: 380,
    },
    icon: "public/icons/JKlogo-512.png",
    background: "build/dmg-background.png", // Optional: custom DMG background
  },

  // Linux configuration (optional)
  linux: {
    target: ["AppImage", "deb"],
    icon: "public/icons",
    category: "Office",
  },

  // Compression
  compression: "maximum",

  // Build options
  buildVersion: process.env.BUILD_VERSION || "1.0.0",

  // Skip rebuilding native modules by default to avoid cross-compilation errors
  // Native modules (like tree-sitter) can't be cross-compiled from macOS to Windows
  // Override with --config.npmRebuild=true if you need to rebuild (only works for same-platform builds)
  npmRebuild: false,

  // Publish configuration (optional - for auto-updates)
  publish: null, // Set to GitHub/GitLab/etc. for auto-updates

  // Skip problematic packages during dependency analysis
  onNodeModuleFile: (file, module) => {
    // Skip @swagger-api packages that have broken dependency references
    if (file.includes("@swagger-api") || file.includes("tree-sitter")) {
      return false; // Don't include in build
    }
    return true;
  },

  // Hook to verify and manually copy .next/standalone if needed
  beforePack: async (context) => {
    console.log(`\n🔧 beforePack hook executing...`);
    console.log(`   context keys: ${Object.keys(context).join(", ")}`);
    console.log(`   appDir: ${context.appDir || "NOT SET"}`);
    console.log(`   outDir: ${context.outDir || "NOT SET"}`);
    console.log(`   projectDir: ${process.cwd()}`);

    const standalonePath = path.join(context.appDir || process.cwd(), ".next", "standalone");
    console.log(`   Checking standalone at: ${standalonePath}`);

    if (!fs.existsSync(standalonePath)) {
      const error = `.next/standalone directory not found at ${standalonePath}. Please run 'npm run build' first.`;
      console.error(`   ❌ ${error}`);
      throw new Error(error);
    }

    console.log(`   ✅ Verified .next/standalone exists`);
    console.log(`   ✅ Source server.js exists: ${fs.existsSync(path.join(standalonePath, "server.js"))}`);
    console.log(`\n`);
  },

  // Hook after files are prepared - manually copy .next/standalone if extraFiles/extraResources didn't work
  // This runs AFTER the app is packaged but BEFORE the installer is created
  afterPack: async (context) => {
    // Force console output (electron-builder might suppress it)
    process.stdout.write(`\n🔧 afterPack hook executing...\n`);
    process.stdout.write(`   context keys: ${Object.keys(context).join(", ")}\n`);
    process.stdout.write(`   appOutDir: ${context.appOutDir || "NOT SET"}\n`);
    process.stdout.write(`   outDir: ${context.outDir || "NOT SET"}\n`);
    process.stdout.write(`   appDir: ${context.appDir || "NOT SET"}\n`);

    // Try multiple possible output directory locations
    const possibleOutDirs = [
      context.appOutDir,
      context.outDir,
      path.join(process.cwd(), "dist", "win-unpacked"),
      path.join(process.cwd(), "dist", "win-x64-unpacked"),
      path.join(process.cwd(), "dist-electron", "win-unpacked"),
      path.join(process.cwd(), "dist-electron", "win-x64-unpacked"),
    ].filter(Boolean);

    const sourceStandalone = path.join(context.appDir || process.cwd(), ".next", "standalone");
    process.stdout.write(`   Source standalone: ${sourceStandalone}\n`);
    process.stdout.write(`   Source exists: ${fs.existsSync(sourceStandalone)}\n`);

    if (!fs.existsSync(sourceStandalone)) {
      process.stderr.write(`❌ Source .next/standalone not found at: ${sourceStandalone}\n`);
      return;
    }

    // Try to copy to each possible output directory
    let copied = false;
    for (const appOutDir of possibleOutDirs) {
      if (!appOutDir || !fs.existsSync(appOutDir)) {
        process.stdout.write(`   Skipping ${appOutDir} (does not exist)\n`);
        continue;
      }

      process.stdout.write(`\n   Processing output directory: ${appOutDir}\n`);

      const targetExtraFiles = path.join(appOutDir, ".next", "standalone");
      const targetExtraResources = path.join(appOutDir, "resources", ".next", "standalone");

      // Check if already copied
      const extraFilesExists = fs.existsSync(path.join(targetExtraFiles, "server.js"));
      const extraResourcesExists = fs.existsSync(path.join(targetExtraResources, "server.js"));

      if (extraFilesExists) {
        process.stdout.write(`   ✅ .next/standalone already exists at: ${targetExtraFiles}\n`);
        copied = true;
        continue;
      }
      if (extraResourcesExists) {
        process.stdout.write(`   ✅ .next/standalone already exists at: ${targetExtraResources}\n`);
        copied = true;
        continue;
      }

      // Manual copy to extraFiles location (app directory) - this is where the executable is
      process.stdout.write(`   ⚠️ .next/standalone not found, manually copying to: ${targetExtraFiles}\n`);
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

        // Verify copy
        const verifyPath = path.join(targetExtraFiles, "server.js");
        if (fs.existsSync(verifyPath)) {
          process.stdout.write(`   ✅ Verification: server.js exists at: ${verifyPath}\n`);
          copied = true;
        } else {
          process.stderr.write(`   ❌ Verification failed: server.js not found at: ${verifyPath}\n`);
        }
      } catch (error) {
        process.stderr.write(`   ❌ Failed to copy: ${error.message}\n`);
        process.stderr.write(`   Stack: ${error.stack}\n`);
      }
    }

    if (copied) {
      process.stdout.write(`\n✅ afterPack hook completed - files copied successfully\n`);
    } else {
      process.stderr.write(`\n⚠️ afterPack hook completed - no files were copied\n`);
    }
    process.stdout.write(`\n`);
  },
};

