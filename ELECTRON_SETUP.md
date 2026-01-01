# Electron Desktop App Setup Guide

This guide explains how to package your Next.js PWA as a native desktop application for Windows and macOS.

## 📋 Prerequisites

1. **Node.js** (v18 or higher)
2. **npm** or **yarn**
3. **For Windows builds**: Build on Windows or use GitHub Actions
4. **For macOS builds**: Build on macOS (required for code signing)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install --save-dev electron electron-builder
```

### 2. Build the Desktop App

**For both Windows and macOS:**
```bash
npm run electron:build
```

**For specific platform:**
```bash
# Windows only
npm run electron:build:win

# macOS only
npm run electron:build:mac

# Linux only
npm run electron:build:linux
```

### 3. Find Your Installers

After building, installers will be in the `dist-electron` directory:
- **Windows**: `JK PosMan Setup x.x.x.exe` (NSIS installer)
- **macOS**: `JK PosMan-x.x.x.dmg` (DMG file)
- **Linux**: `JK PosMan-x.x.x.AppImage` (AppImage)

## 📁 Project Structure

```
posman-app/
├── electron/
│   ├── main.js          # Electron main process
│   └── preload.js       # Preload script (security)
├── electron-builder.config.js  # Build configuration
├── build/
│   └── entitlements.mac.plist  # macOS entitlements
└── scripts/
    └── build-electron.js       # Build script
```

## 🔧 Development

### Run Electron in Development Mode

```bash
# Terminal 1: Start Next.js dev server
npm run dev

# Terminal 2: Start Electron
npm run electron:dev
```

## 🏗️ Build Process

The build process works as follows:

1. **Next.js Build**: Builds your Next.js app in standalone mode
2. **Electron Packaging**: Packages the app with Electron
3. **Installer Creation**: Creates platform-specific installers

### Build Configuration

The build is configured in `electron-builder.config.js`:

- **Windows**: Creates NSIS installer and portable version
- **macOS**: Creates DMG and ZIP files
- **Linux**: Creates AppImage and DEB packages

## 📦 Installation Files Created

### Windows
- `JK PosMan Setup x.x.x.exe` - Full installer with setup wizard
- `JK PosMan x.x.x.exe` - Portable version (no installation needed)

### macOS
- `JK PosMan-x.x.x.dmg` - Disk image for installation
- `JK PosMan-x.x.x-mac.zip` - ZIP archive

### Linux
- `JK PosMan-x.x.x.AppImage` - Portable AppImage
- `JK PosMan-x.x.x.deb` - Debian package

## 🔐 Code Signing (Optional but Recommended)

### macOS Code Signing

1. Get an Apple Developer certificate
2. Update `electron-builder.config.js`:

```javascript
mac: {
  identity: 'Developer ID Application: Your Name (TEAM_ID)',
  hardenedRuntime: true,
  gatekeeperAssess: false,
}
```

3. Build with signing:
```bash
CSC_LINK=/path/to/certificate.p12 CSC_KEY_PASSWORD=password npm run electron:build:mac
```

### Windows Code Signing

1. Get a code signing certificate
2. Update `electron-builder.config.js`:

```javascript
win: {
  certificateFile: '/path/to/certificate.pfx',
  certificatePassword: 'password',
}
```

3. Build with signing:
```bash
CSC_LINK=/path/to/certificate.pfx CSC_KEY_PASSWORD=password npm run electron:build:win
```

## 🎨 Customization

### App Icon

Replace the icon files:
- `public/icons/JKlogo-512.png` - Main icon (512x512)
- `public/icons/JKlogo-192.png` - Small icon (192x192)

For best results, create platform-specific icons:
- **Windows**: `.ico` format
- **macOS**: `.icns` format
- **Linux**: `.png` format

### App Metadata

Edit `electron-builder.config.js` to customize:
- App name
- App ID
- Publisher name
- Version
- Description

## 🐛 Troubleshooting

### Build Fails: "Standalone build not found"

**Solution**: Make sure Next.js is configured for standalone output:
```javascript
// next.config.mjs
output: 'standalone',
```

### macOS: "App is damaged and can't be opened"

**Solution**: This happens when the app isn't code signed. Either:
1. Code sign the app (recommended)
2. Or run: `xattr -cr /path/to/app.app`

### Windows: Antivirus flags the installer

**Solution**: Code sign your Windows installer to avoid false positives.

### Port Already in Use

**Solution**: Change the port in `electron/main.js`:
```javascript
const PORT = process.env.PORT || 3001; // Use different port
```

## 📝 Environment Variables

You can set these environment variables:

- `ELECTRON_BUILD=true` - Enables standalone Next.js build
- `PORT=3000` - Port for Next.js server (default: 3000)
- `CSC_LINK` - Path to code signing certificate
- `CSC_KEY_PASSWORD` - Password for code signing certificate

## 🚀 Distribution

### Windows Distribution

1. Build the installer: `npm run electron:build:win`
2. Test the installer on a clean Windows machine
3. Upload to your distribution platform
4. Consider code signing to avoid Windows Defender warnings

### macOS Distribution

1. Build the DMG: `npm run electron:build:mac`
2. Code sign the app (required for distribution)
3. Notarize with Apple (required for macOS Catalina+)
4. Upload to your distribution platform

### Auto-Updates (Optional)

To enable auto-updates, configure a publish server in `electron-builder.config.js`:

```javascript
publish: {
  provider: 'github',
  owner: 'your-username',
  repo: 'posman-app',
}
```

## 📚 Additional Resources

- [Electron Documentation](https://www.electronjs.org/docs)
- [electron-builder Documentation](https://www.electron.build/)
- [Next.js Standalone Output](https://nextjs.org/docs/advanced-features/output-file-tracing)

## ✅ Checklist Before Distribution

- [ ] App icons are properly sized and formatted
- [ ] App metadata is correct (name, version, description)
- [ ] Code signing is configured (recommended)
- [ ] App has been tested on target platforms
- [ ] Database connection works in packaged app
- [ ] Environment variables are properly configured
- [ ] License file is included (if required)
- [ ] Readme/help documentation is included

---

**Note**: For production builds, always test on clean machines without development dependencies to ensure everything works correctly.
