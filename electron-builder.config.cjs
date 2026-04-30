/* eslint-disable @typescript-eslint/no-require-imports */
const path = require("path");
const fs = require("fs");

const winArchEnv = (process.env.WIN_ARCH || "").toLowerCase();
const resolvedWinArch =
  winArchEnv === "ia32" || winArchEnv === "x86"
    ? "ia32"
    : winArchEnv === "x64"
      ? "x64"
      : "x64";

module.exports = {
  appId: "com.jk.posman",
  productName: "JK PosMan",
  copyright: "Copyright © 2024 JK PosMan",

  icon: "public/icons/JK-icon.png",

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

  // Windows configuration
  // Use WIN_ARCH=ia32 to produce a separate x86 installer when explicitly needed.
  win: {
    target: [{ target: "nsis", arch: [resolvedWinArch] }],
    icon: "public/icons/JK-icon.ico",
    requestedExecutionLevel: "asInvoker",
    signAndEditExecutable: false,
    // Signing of the NSIS installer is controlled via CSC_LINK / CSC_KEY_PASSWORD env vars.
    // When WINDOWS_CERTIFICATE secret is absent, the build stays unsigned (same as before).
  },

  nsis: {
    oneClick: false,
    license: "LICENSE_TERMS.txt",
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
    icon: "public/icons/JK-icon.png",
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
    icon: "public/icons/JK-icon.png",
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
  // Native modules are patched in afterPack (better-sqlite3 + keytar for Windows).
  // Keep npmRebuild disabled to avoid non-deterministic cross-platform rebuild behavior.
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
