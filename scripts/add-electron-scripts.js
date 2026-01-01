#!/usr/bin/env node

/**
 * Script to add Electron-related scripts to package.json
 * Run this once to add the necessary npm scripts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const packageJsonPath = path.join(process.cwd(), 'package.json');

try {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  // Add Electron scripts if they don't exist
  if (!packageJson.scripts) {
    packageJson.scripts = {};
  }

  const electronScripts = {
    'electron:dev': 'electron electron/main.cjs',
    'electron:build': 'node scripts/build-electron.js',
    'electron:build:win': 'node scripts/build-electron.js win',
    'electron:build:mac': 'node scripts/build-electron.js mac',
    'electron:build:linux': 'node scripts/build-electron.js linux',
    'electron:pack': 'electron-builder',
    'electron:pack:win': 'electron-builder --win',
    'electron:pack:mac': 'electron-builder --mac',
    'electron:pack:linux': 'electron-builder --linux',
  };

  let updated = false;
  for (const [key, value] of Object.entries(electronScripts)) {
    if (!packageJson.scripts[key]) {
      packageJson.scripts[key] = value;
      updated = true;
      console.log(`✅ Added script: ${key}`);
    }
  }

  // Add main entry point for Electron
  if (!packageJson.main) {
    packageJson.main = 'electron/main.cjs';
    updated = true;
    console.log('✅ Added main entry point');
  }

  if (updated) {
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
    console.log('\n✅ package.json updated successfully!');
    console.log('\n📦 Next steps:');
    console.log('   1. Install dependencies: npm install --save-dev electron electron-builder');
    console.log('   2. Build the app: npm run electron:build');
  } else {
    console.log('✅ All Electron scripts already exist in package.json');
  }
} catch (error) {
  console.error('❌ Error updating package.json:', error.message);
  process.exit(1);
}

