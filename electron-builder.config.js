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
  extraResources: [
    {
      from: ".next/standalone",
      to: ".next/standalone",
      filter: ["**/*"],
    },
  ],

  // Keep extraFiles for icons only (extraResources handles .next/standalone)
  extraFiles: [
    {
      from: "public/icons",
      to: "public/icons",
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
};

