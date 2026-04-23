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
    "node_modules/**/*",
    "!node_modules/**/tree-sitter*/**",
    "!node_modules/**/@swagger-api/**",
    "!node_modules/**/swagger-ui-react/**",
    "!node_modules/**/@tree-sitter-grammars/**",
  ],

  asar: true,
  nodeGypRebuild: false,

  // Unpack from ASAR so utilityProcess can read server.js
  asarUnpack: [
    "**/.next/standalone/**",
    ".next/standalone/**",
  ],

  // Copy .next/standalone to resources/ (bypasses ASAR entirely)
  extraResources: [
    {
      from: ".next/standalone",
      to: ".next/standalone",
      filter: ["**/*"],
    },
  ],

  // Also copy to app dir (same level as executable) as a fallback
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
      { target: "nsis", arch: ["x64", "ia32"] },
      { target: "portable", arch: ["x64"] },
    ],
    icon: "public/icons/JKlogo-512.png",
    requestedExecutionLevel: "asInvoker",
    signAndEditExecutable: false,
  },

  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: "JK PosMan",
    runAfterFinish: true,
    installerIcon: "public/icons/JKlogo-512.png",
    uninstallerIcon: "public/icons/JKlogo-512.png",
    installerHeaderIcon: "public/icons/JKlogo-512.png",
    include: "build/installer.nsh",
    script: "build/installer-copy-standalone.nsh",
    license: "LICENSE",
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

  compression: "maximum",
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
