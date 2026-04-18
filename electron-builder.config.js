const path = require("path");
const fs = require("fs");

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

// Code signing config — reads cert path and password from env vars.
// CERT_PFX_PATH: path to the .pfx file (defaults to build/signing/cert.pfx)
// CERT_PASSWORD:  password for the .pfx (defaults to jkposman-dev-cert for the self-signed cert)
// To disable signing entirely, set SKIP_SIGNING=true
const getSigningConfig = () => {
  if (process.env.SKIP_SIGNING === "true") {
    return { signAndEditExecutable: false };
  }
  const pfxPath = process.env.CERT_PFX_PATH || path.join(__dirname, "build", "signing", "cert.pfx");
  if (!fs.existsSync(pfxPath)) {
    console.warn(`⚠️  No certificate found at ${pfxPath}. Skipping signing.`);
    console.warn(`   Run: node scripts/generate-self-signed-cert.cjs`);
    return { signAndEditExecutable: false };
  }
  return {
    signAndEditExecutable: true,
    certificateFile: pfxPath,
    certificatePassword: process.env.CERT_PASSWORD || "jkposman-dev-cert",
  };
};

module.exports = {
  appId: "com.jk.posman",
  productName: "JK PosMan",
  copyright: "Copyright © 2024 JK PosMan",

  icon: "public/icons/JKlogo-512.ico",

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

  asar: true,
  nodeGypRebuild: false,

  asarUnpack: [
    "**/.next/standalone/**",
    "**/.next/standalone/**/*",
    ".next/standalone/**",
    ".next/standalone/**/*",
  ],

  extraResources: [
    {
      from: ".next/standalone",
      to: ".next/standalone",
      filter: ["**/*"],
    },
  ],

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
    icon: "public/icons/JKlogo-512.ico",
    publisherName: "JK PosMan",
    requestedExecutionLevel: "asInvoker",
    ...getSigningConfig(),
  },

  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: "JK PosMan",
    runAfterFinish: true,
    installerIcon: "public/icons/JKlogo-512.ico",
    uninstallerIcon: "public/icons/JKlogo-512.ico",
    installerHeaderIcon: "public/icons/JKlogo-512.ico",
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
      { x: 410, y: 150, type: "link", path: "/Applications" },
      { x: 130, y: 150, type: "file" },
    ],
    window: { width: 540, height: 380 },
    icon: "public/icons/JKlogo-512.png",
    background: "build/dmg-background.png",
  },

  linux: {
    target: ["AppImage", "deb"],
    icon: "public/icons",
    category: "Office",
  },

  compression: "maximum",
  buildVersion: process.env.BUILD_VERSION || "1.0.0",
  npmRebuild: false,

  // Auto-update: publish releases to GitHub.
  // electron-updater reads latest.yml from the GitHub release assets to check for updates.
  // To publish: set GH_TOKEN env var and run electron:publish:win
  publish: {
    provider: "github",
    owner: "ojsmaina",
    repo: "posman",
    releaseType: "release",
  },

  onNodeModuleFile: (file, module) => {
    if (file.includes("@swagger-api") || file.includes("tree-sitter")) {
      return false;
    }
    return true;
  },

  beforePack: async (context) => {
    console.log(`\n🔧 beforePack hook executing...`);
    console.log(`   appDir: ${context.appDir || "NOT SET"}`);
    console.log(`   outDir: ${context.outDir || "NOT SET"}`);
    console.log(`   projectDir: ${process.cwd()}`);

    const standalonePath = path.join(context.appDir || process.cwd(), ".next", "standalone");
    if (!fs.existsSync(standalonePath)) {
      const error = `.next/standalone directory not found at ${standalonePath}. Please run 'npm run build' first.`;
      console.error(`   ❌ ${error}`);
      throw new Error(error);
    }

    console.log(`   ✅ Verified .next/standalone exists`);
    console.log(`   ✅ Source server.js exists: ${fs.existsSync(path.join(standalonePath, "server.js"))}\n`);
  },

  afterPack: "./scripts/afterPackHook.js",
};
