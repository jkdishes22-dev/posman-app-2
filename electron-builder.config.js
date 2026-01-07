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

  directories: {
    output: "dist-electron",
    buildResources: "build",
  },

  files: [
    "electron/**/*",
    ".next/standalone/**/*",
    ".next/static/**/*",
    "public/**/*",
    "package.json",
    "node_modules/**/*",
    // Exclude problematic native modules that can't be cross-compiled
    "!node_modules/**/tree-sitter*/**",
    "!node_modules/**/@swagger-api/**",
    "!node_modules/**/swagger-ui-react/**",
  ],

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
    // electron-builder will automatically convert .png to .ico if .ico doesn't exist
    // But it's better to provide .ico file for best quality
    icon: "public/icons/JKlogo-512.ico", // Falls back to .png if .ico doesn't exist
    publisherName: "JK PosMan",
    requestedExecutionLevel: "asInvoker",
  },

  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: "JK PosMan",
    runAfterFinish: true, // Launch app after installation completes
    // electron-builder will convert PNG to ICO automatically if ICO doesn't exist
    installerIcon: "public/icons/JKlogo-512.ico", // Falls back to .png if .ico doesn't exist
    uninstallerIcon: "public/icons/JKlogo-512.ico",
    installerHeaderIcon: "public/icons/JKlogo-512.ico",
    include: "build/installer.nsh",
    license: "LICENSE",
    menuCategory: "Business",
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
};

