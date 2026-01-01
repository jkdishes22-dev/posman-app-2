const path = require('path');

module.exports = {
  appId: 'com.jk.posman',
  productName: 'JK PosMan',
  copyright: 'Copyright © 2024 JK PosMan',
  
  directories: {
    output: 'dist-electron',
    buildResources: 'build',
  },

  files: [
    'electron/**/*',
    '.next/standalone/**/*',
    '.next/static/**/*',
    'public/**/*',
    'package.json',
    'node_modules/**/*',
  ],

  extraFiles: [
    {
      from: 'public/icons',
      to: 'public/icons',
      filter: ['**/*'],
    },
  ],

  // Windows configuration
  win: {
    target: [
      {
        target: 'nsis',
        arch: ['x64', 'ia32'],
      },
      {
        target: 'portable',
        arch: ['x64'],
      },
    ],
    icon: 'public/icons/JKlogo-512.png',
    publisherName: 'JK PosMan',
    requestedExecutionLevel: 'asInvoker',
  },

  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'JK PosMan',
    installerIcon: 'public/icons/JKlogo-512.png',
    uninstallerIcon: 'public/icons/JKlogo-512.png',
    installerHeaderIcon: 'public/icons/JKlogo-512.png',
    include: 'build/installer.nsh',
    license: 'LICENSE',
    menuCategory: 'Business',
  },

  // macOS configuration
  mac: {
    target: [
      {
        target: 'dmg',
        arch: ['x64', 'arm64'],
      },
      {
        target: 'zip',
        arch: ['x64', 'arm64'],
      },
    ],
    icon: 'public/icons/JKlogo-512.png',
    category: 'public.app-category.business',
    hardenedRuntime: true,
    gatekeeperAssess: false,
    entitlements: 'build/entitlements.mac.plist',
    entitlementsInherit: 'build/entitlements.mac.plist',
  },

  dmg: {
    contents: [
      {
        x: 410,
        y: 150,
        type: 'link',
        path: '/Applications',
      },
      {
        x: 130,
        y: 150,
        type: 'file',
      },
    ],
    window: {
      width: 540,
      height: 380,
    },
    icon: 'public/icons/JKlogo-512.png',
    background: 'build/dmg-background.png', // Optional: custom DMG background
  },

  // Linux configuration (optional)
  linux: {
    target: ['AppImage', 'deb'],
    icon: 'public/icons',
    category: 'Office',
  },

  // Compression
  compression: 'maximum',
  
  // Build options
  buildVersion: process.env.BUILD_VERSION || '1.0.0',
  
  // Publish configuration (optional - for auto-updates)
  publish: null, // Set to GitHub/GitLab/etc. for auto-updates
};

