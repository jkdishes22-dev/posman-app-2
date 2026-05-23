/* eslint-disable @typescript-eslint/no-require-imports */
const path = require("path");
const fs = require("fs");

const winArchEnv = (process.env.WIN_ARCH || "").toLowerCase();
/** One NSIS per entry; `all` emits both x64 and ia32 installers in dist-electron (names differ by ${arch}). */
const winArchs =
  winArchEnv === "all" || winArchEnv === "both" || winArchEnv === "x64+ia32" || winArchEnv === "ia32+x64"
    ? ["x64", "ia32"]
    : winArchEnv === "ia32" || winArchEnv === "x86"
      ? ["ia32"]
      : winArchEnv === "arm64"
        ? ["arm64"]
        : ["x64"];

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
    {
      from: "public/license/public-key.pem",
      to: "public/license/public-key.pem",
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
  // WIN_ARCH=ia32 | x64 | arm64 | all (x64+ia32 NSIS in one run). Default when unset: x64 only.
  win: {
    target: [{ target: "nsis", arch: winArchs }],
    // ${arch} is ia32 | x64 | arm64 so x86 and x64 installers do not overwrite each other in dist-electron.
    artifactName: "${productName} Setup ${version}-${arch}.${ext}",
    icon: "public/icons/JK-icon.ico",
    requestedExecutionLevel: "asInvoker",
    signAndEditExecutable: false,
    // Signing of the NSIS installer is controlled via CSC_LINK / CSC_KEY_PASSWORD env vars.
    // When WINDOWS_CERTIFICATE secret is absent, the build stays unsigned (same as before).
  },

  nsis: {
    oneClick: false,
    include: "scripts/installer-user-context.nsh",
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
