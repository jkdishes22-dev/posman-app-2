# Quick Start: Creating Desktop Installers

## 🎯 Goal
Package your Next.js PWA as native desktop applications for Windows and macOS.

## ⚡ Quick Setup (5 minutes)

### Step 1: Install Dependencies
```bash
npm install --save-dev electron electron-builder
```

### Step 2: Add Scripts to package.json
```bash
node scripts/add-electron-scripts.js
```

This will automatically add all necessary npm scripts to your package.json.

### Step 3: Build Installers

**For both platforms:**
```bash
npm run electron:build
```

**For specific platform:**
```bash
npm run electron:build:win   # Windows only
npm run electron:build:mac   # macOS only
```

### Step 4: Find Your Installers

Check the `dist-electron` folder:
- **Windows**: `JK PosMan Setup x.x.x.exe`
- **macOS**: `JK PosMan-x.x.x.dmg`

## 🧪 Test in Development

```bash
# Terminal 1: Start Next.js
npm run dev

# Terminal 2: Start Electron
npm run electron:dev
```

## 📋 What Was Created

1. **electron/main.js** - Main Electron process
2. **electron/preload.js** - Security preload script
3. **electron-builder.config.js** - Build configuration
4. **scripts/build-electron.js** - Build automation
5. **build/entitlements.mac.plist** - macOS security settings

## 🚨 Important Notes

1. **macOS builds** must be done on a Mac
2. **Windows builds** can be done on Windows or via CI/CD
3. **Code signing** is recommended for distribution (see ELECTRON_SETUP.md)
4. **Database**: Make sure your `.env` file is configured correctly

## 📚 Full Documentation

See `ELECTRON_SETUP.md` for:
- Detailed configuration
- Code signing setup
- Troubleshooting
- Distribution guidelines

## ✅ Next Steps

1. ✅ Install dependencies
2. ✅ Run the setup script
3. ✅ Build your first installer
4. ✅ Test on a clean machine
5. ✅ Configure code signing (optional but recommended)
