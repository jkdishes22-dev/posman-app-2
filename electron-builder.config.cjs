/* eslint-disable @typescript-eslint/no-require-imports */
const path = require("path");
const fs = require("fs");

module.exports = {
  appId: "com.jk.posman",
  productName: "JK PosMan",
  copyright: "Copyright © 2024 JK PosMan",

  icon: "public/icons/JKlogo-512.png",

  directories: {
    output: "dist-electron",
    buildResources: "build",
  },

  files: [
    "electron/**/*",
    // .next/standalone is copied via extraResources (outside ASAR) so utilityProcess can access it
    ".next/static/**/*",
    "public/**/*",
    "package.json",
    // Exclude ALL node_modules from ASAR — .next/standalone ships its own node_modules,
    // so packing root node_modules too doubles size (~1 GB+) and OOMs the 7 GB CI runner.
    // electron-updater is required lazily in main.cjs (try/catch) so omitting it is safe.
    "!node_modules/**/*",
  ],

  asar: true,
  nodeGypRebuild: false,

  // Copy .next/standalone to resources/ (outside ASAR so utilityProcess can read server.js).
  // Keep only ONE copy here — duplicating via extraFiles + asarUnpack blows the 14 GB runner disk.
  extraResources: [
    {
      from: ".next/standalone",
      to: ".next/standalone",
      filter: ["**/*"],
    },
  ],

  // icons only — .next/standalone is handled by extraResources above
  extraFiles: [
    {
      from: "public/icons",
      to: "public/icons",
      filter: ["**/*"],
    },
  ],

  // Windows configuration — x64 only (all supported Win 10+ machines are 64-bit)
  win: {
    target: [{ target: "nsis", arch: ["x64"] }],
    icon: "public/icons/JKlogo-512.png",
    requestedExecutionLevel: "asInvoker",
    signingHashAlgorithms: ["sha256"],
    // Signing is enabled when CSC_LINK env var is set (build-windows.yml decodes it from
    // the WINDOWS_CERTIFICATE secret). When the secret is absent the build stays unsigned.
  },

  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: "JK PosMan",
    runAfterFinish: true,
    // Do NOT set installerIcon/uninstallerIcon/installerHeaderIcon here —
    // NSIS requires .ico format but the project only has a .png.
    // electron-builder auto-converts the top-level icon field to .ico for NSIS.
    menuCategory: "Business",
    perMachine: false,
    deleteAppDataOnUninstall: false,
  },

  // macOS configuration
  mac: {
    target: [
      { target: "dmg", arch: ["x64", "arm64"] },
      { target: "zip", arch: ["x64", "arm64"] },
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
      { x: 410, y: 150, type: "link", path: "/Applications" },
      { x: 130, y: 150, type: "file" },
    ],
    window: { width: 540, height: 380 },
    icon: "public/icons/JKlogo-512.png",
  },

  // Linux configuration
  linux: {
    target: ["AppImage", "deb"],
    icon: "public/icons",
    category: "Office",
  },

  compression: "normal",
  buildVersion: process.env.BUILD_VERSION || "1.0.0",
  npmRebuild: false,
  publish: null,

  beforePack: async (context) => {
    const standalonePath = path.join(context.appDir || process.cwd(), ".next", "standalone");
    if (!fs.existsSync(standalonePath)) {
      throw new Error(`.next/standalone not found at ${standalonePath}. Run 'npm run build' first.`);
    }
    console.log(`\n🔧 beforePack: .next/standalone verified at ${standalonePath}`);
  },

  afterPack: "./scripts/afterPackHook.cjs",
};
