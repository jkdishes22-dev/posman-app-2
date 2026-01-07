# Posman - Point of Sale Management System

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## About

Posman is a comprehensive Point of Sale (POS) and retail management system built with Next.js. It provides features for managing sales, inventory, bills, payments, and user permissions in a retail environment.

### Key Features

- **Sales Management**: Process and track sales transactions
- **Bill Management**: Create, submit, and track bills with support for multiple payment methods (Cash/M-Pesa)
- **User Management**: Role-based access control with detailed permissions
- **Inventory Management**: Track and manage product inventory
- **Multi-station Support**: Support for multiple sales stations/points
- **Price List Management**: Flexible pricing system with support for different price lists
- **Real-time Updates**: Instant updates for sales and inventory data
- **Responsive UI**: Built with Bootstrap for a modern, mobile-friendly interface
- **Progressive Web App**: Offline support and installable on mobile devices
- **Desktop Application**: Windows desktop app support via Electron

## Tech Stack

- **Frontend**: Next.js, React, Bootstrap, TypeScript
- **Backend**: Next.js API Routes, Express
- **Database**: MySQL with TypeORM
- **Authentication**: JWT
- **State Management**: React Hooks
- **Styling**: Bootstrap 5 with React-Bootstrap
- **Date Handling**: date-fns
- **API Documentation**: Swagger UI
- **PWA Support**: next-pwa with Workbox
- **Desktop App**: Electron (for Windows packaging)

## Project Structure

```
posman-app/
├── src/
│   ├── app/              # Next.js 13+ App Router components
│   │   ├── admin/       # Admin dashboard components
│   │   ├── components/  # Shared React components
│   │   ├── home/        # Main application pages
│   │   └── shared/      # Shared utilities and layouts
│   └── backend/         # Backend implementation
│       ├── config/      # Configuration files
│       ├── controllers/ # API controllers
│       ├── entities/    # TypeORM entities
│       ├── middleware/  # Express middleware
│       └── service/     # Business logic services
├── pages/               # API routes and legacy pages
├── public/             # Static assets
└── styles/             # Global styles
```

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v18 or higher)
- MySQL (v8.0 or higher)
- npm or yarn package manager

## Installation

1. Clone the repository:
```bash
git clone <your-repository-url>
cd posman-app
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit the `.env` file with your configuration:
```env
# Database (supports both DB_* and MYSQL_* prefixes)
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=posman_db
# Alternative: MYSQL_HOST, MYSQL_PORT, MYSQL_USERNAME, MYSQL_PASSWORD, MYSQL_DATABASE

# JWT
JWT_SECRET=your_jwt_secret

# App
PORT=3000
NODE_ENV=development
```

## Development

Run the development server:

```bash
npm run dev
# or
yarn dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

### Type Checking

Run TypeScript compiler to check for type errors:

```bash
npm run tsc
# or
yarn tsc
```

### Linting

Check and fix code style issues:

```bash
npm run lint
# or
yarn lint
```

## Building for Production

1. Build the application:
```bash
npm run build
# or
yarn build
```

2. Start the production server:
```bash
npm run start
# or
yarn start
```

The production build includes:
- Optimized JavaScript bundles
- Minified CSS
- Static asset optimization
- Progressive Web App features
- Service Worker for offline support

## Building for Windows (Electron Desktop App)

This application can be packaged as a Windows desktop application using Electron.

### Prerequisites for Windows Build

- Node.js (v18 or higher)
- All project dependencies installed (`npm install`)
- Icon file: `public/icons/JKlogo-512.png` (for Windows installer icon)

### Building Windows Installer

#### Step 1: Build Next.js in Standalone Mode

```bash
ELECTRON_BUILD=true npm run build
```

This creates a standalone Next.js build optimized for Electron packaging.

#### Step 2: Build Windows Installer

Use the automated build script:

```bash
node scripts/build-electron.js win
```

The build script will:
- Automatically detect cross-compilation (if building on macOS/Linux)
- Skip native module rebuilding to avoid cross-compilation errors
- Create Windows installers in the `dist/` directory

#### Alternative: Direct Command

You can also run electron-builder directly:

```bash
npx electron-builder --win --config.npmRebuild=false
```

### Build Output: Dist Folder Contents

After a successful build, the `dist/` folder contains:

#### 📦 Main Installer Files

1. **`posman-app Setup x.x.x.exe`** (~500MB)
   - **Purpose**: Windows installer (NSIS format) for end users
   - **Features**: 
     - Full installation wizard
     - Desktop shortcut creation
     - Start menu integration
     - Uninstaller included
   - **Distribution**: This is the file you distribute to Windows users

2. **`posman-app Setup x.x.x.exe.blockmap`** (~550KB)
   - **Purpose**: Block map file for incremental updates
   - **Use**: Only needed if you implement auto-updates

#### 📁 Unpacked Application Folder

**`win-arm64-unpacked/`** or **`win-x64-unpacked/`** - Complete unpacked application

Structure:
```
win-*-unpacked/
├── electron.exe              # Electron runtime executable
├── resources/
│   └── app.asar              # Your entire Next.js app (packaged as ASAR archive)
├── locales/                  # Language packs for Electron UI (100+ files)
│   ├── en-US.pak
│   └── ...
├── *.dll                     # Windows system libraries
│   ├── d3dcompiler_47.dll    # DirectX compiler
│   ├── ffmpeg.dll            # Media codecs
│   ├── libEGL.dll            # OpenGL ES
│   └── ...
├── icudtl.dat                # ICU (Internationalization) data
├── v8_context_snapshot.bin   # V8 JavaScript engine snapshot
└── LICENSE files             # Electron and Chromium licenses
```

**Key Components:**
- **`electron.exe`**: The Electron runtime that runs your app
- **`resources/app.asar`**: Your entire Next.js application packaged as an ASAR archive
  - Contains: `.next/standalone/`, `node_modules/`, `public/`, `electron/`, etc.
- **`locales/`**: Language packs for Electron's UI (menus, dialogs, etc.)
- **`*.dll` files**: Windows system libraries for graphics, media, and system functions

#### 📄 Configuration Files

- **`builder-effective-config.yaml`**: Shows the actual electron-builder configuration used
- **`builder-debug.yml`**: Debug information from the build process
- **`latest.yml`**: Update metadata (for auto-updates if implemented)

### What to Distribute

**For End Users:**
- ✅ **`posman-app Setup x.x.x.exe`** - This is the only file users need

**For Development/Testing:**
- Run `electron.exe` from the unpacked folder to test without installing

**For Auto-Updates (if implemented):**
- Installer `.exe` file
- `latest.yml`
- `.blockmap` file

### Architecture Notes

⚠️ **Important**: When building on macOS/Linux for Windows, the build creates a Windows ARM64 version (if on ARM Mac) or matches your system architecture.

**For Windows x64/ia32 builds:**
1. **Build on Windows** (recommended):
   ```bash
   # On a Windows machine
   node scripts/build-electron.js win
   ```

2. **Use CI/CD** (GitHub Actions, etc.):
   ```yaml
   # .github/workflows/build.yml
   - name: Build Windows
     runs-on: windows-latest
     steps:
       - uses: actions/checkout@v4
       - uses: actions/setup-node@v4
         with:
           node-version: '20.x'
       - run: npm ci
       - run: ELECTRON_BUILD=true npm run build
       - run: npx electron-builder --win --x64 --config.npmRebuild=false
   ```

3. **Accept ARM64 build**: Works on Windows on ARM devices, but won't work on standard x64 Windows machines

### File Sizes Explained

- **Installer (~500MB)**: Includes Electron runtime, Chromium, your app, and all dependencies
- **Unpacked folder (~500MB)**: Same content, just unpacked
- **Blockmap (~550KB)**: Small metadata for updates

The large size is normal for Electron apps because they include:
- Chromium browser engine (~200MB)
- Node.js runtime (~50MB)
- Electron framework (~50MB)
- Your Next.js app and dependencies (~200MB)

### Testing the Build

**On Windows:**
1. Transfer `posman-app Setup x.x.x.exe` to a Windows machine
2. Run the installer
3. Launch the app from Start Menu or Desktop shortcut

**Without Installing (Development):**
1. Navigate to `dist/win-*-unpacked/`
2. Run `electron.exe` directly
3. The app will launch without installation

### Troubleshooting

**Build fails with "electron-builder: command not found"**
- ✅ Fixed: The script now uses `npx electron-builder`

**Build fails with native module errors**
- The script automatically skips native module rebuilding for cross-compilation
- If issues persist, ensure `--config.npmRebuild=false` is set

**Build creates wrong architecture**
- Check your config: `electron-builder.config.js` → `win.target.arch`
- For x64, build on Windows or use CI/CD

**Installer is too large**
- Normal for Electron apps (~500MB)
- Consider code splitting or removing unused dependencies
- Compression is already enabled (`compression: 'maximum'`)

### Building with GitHub Actions

The project includes GitHub Actions workflows for automated Windows builds. This is the recommended way to build Windows installers, especially for x64/ia32 architectures.

#### Available Workflows

1. **`build-windows-x64.yml`** - Continuous builds (x64 only)
   - **Triggers**: On every push to `main` branch, pull requests, or manual trigger
   - **Purpose**: Quick builds for testing and development
   - **Artifact Retention**: 7 days

2. **`build-windows.yml`** - Release builds (x64 + ia32)
   - **Triggers**: On version tags (e.g., `v1.0.0`), GitHub releases, or manual trigger
   - **Purpose**: Production releases with both architectures
   - **Artifact Retention**: 30 days
   - **Also creates**: GitHub Release with installers attached

#### How to Use

**For Development/Testing Builds:**

1. Push to `main` branch or create a pull request
2. The `build-windows-x64.yml` workflow will run automatically
3. Download the installer from the Actions tab:
   - Go to **Actions** tab in your GitHub repository
   - Click on the workflow run (e.g., "Build Windows Installer (x64)")
   - Scroll to the **Artifacts** section at the bottom
   - Click on **windows-installer-x64** to download the ZIP file
   - Extract the ZIP to get the `.exe` installer

**For Production Releases:**

**Option 1: Using Git Tags (Recommended - Auto-creates Release)**

1. Create and push a version tag:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. The `build-windows.yml` workflow will automatically:
   - Build both x64 and ia32 installers
   - Upload them as artifacts
   - **Create a GitHub Release** with installers attached

3. Download from either location:
   - **Releases tab** → Your release → Assets section (direct download)
   - **Actions tab** → Artifacts section (as backup)

**Option 2: Creating GitHub Release Manually**

1. Create a GitHub Release through the web interface:
   - Go to **Releases** → **Draft a new release**
   - Create a tag (e.g., `v1.0.0`) or use an existing tag
   - Publish the release

2. The `build-windows.yml` workflow will:
   - Build both x64 and ia32 installers
   - Upload them as artifacts
   - **Note**: Installers will be in artifacts only (not automatically attached to the release)

3. Manually attach installers to the release:
   - Download artifacts from the Actions tab
   - Edit the release and upload the `.exe` files to the Assets section

**Recommendation**: Use Option 1 (Git tags) for automatic release creation with installers attached.

#### Manual Trigger

You can also manually trigger a build:

1. Go to **Actions** tab
2. Select the workflow (e.g., "Build Windows Installer")
3. Click **Run workflow** button
4. Choose branch and click **Run workflow**

#### What's Included in Artifacts

When you download the artifact ZIP, it contains:
- `posman-app Setup x.x.x.exe` - The Windows installer
- `posman-app Setup x.x.x.exe.blockmap` - Update metadata (for auto-updates)
- `latest.yml` - Update configuration (for auto-updates)

#### Workflow Features

- ✅ Automatic Next.js standalone build
- ✅ Cross-compilation support (builds x64/ia32 on Windows runners)
- ✅ Native module rebuild skipping (prevents build errors)
- ✅ Artifact upload for easy download
- ✅ Release creation with installers attached (for tagged releases)
- ✅ Build status notifications in workflow logs

#### GitHub Secrets Configuration

The workflows require certain secrets to be configured in your GitHub repository. Here's what you need to set up:

**Required Secrets:**

1. **`DATABASE_URL`** (Optional but recommended)
   - **Purpose**: Database connection string for Next.js build (if your build process needs database access)
   - **Format**: `mysql://username:password@host:port/database_name`
   - **Example**: `mysql://user:pass@localhost:3306/posman_db`
   - **Note**: May not be required if your build doesn't connect to the database during build time
   - **How to add**: Repository Settings → Secrets and variables → Actions → New repository secret

2. **`JWT_SECRET`** (Optional but recommended)
   - **Purpose**: JWT secret key for authentication (if used during build)
   - **Format**: Any secure random string
   - **Example**: `your-super-secret-jwt-key-here`
   - **Note**: Use a strong, random string. Can be the same as your production secret or a build-only secret
   - **How to add**: Repository Settings → Secrets and variables → Actions → New repository secret

**Automatically Provided (No setup needed):**

- **`GITHUB_TOKEN`** - Automatically provided by GitHub Actions
  - Used for creating releases and uploading artifacts
  - No configuration required

**How to Add Secrets:**

1. Go to your GitHub repository
2. Click **Settings** (top menu)
3. Click **Secrets and variables** → **Actions** (left sidebar)
4. Click **New repository secret**
5. Enter the secret name (e.g., `DATABASE_URL`)
6. Enter the secret value
7. Click **Add secret**

**Optional: Making Secrets Optional**

If your Next.js build doesn't require these secrets (most builds don't), you can make them optional by updating the workflow:

```yaml
env:
  ELECTRON_BUILD: "true"
  NODE_ENV: "production"
  DATABASE_URL: ${{ secrets.DATABASE_URL || '' }}
  JWT_SECRET: ${{ secrets.JWT_SECRET || 'build-only-secret' }}
```

Or remove them entirely if not needed:

```yaml
env:
  ELECTRON_BUILD: "true"
  NODE_ENV: "production"
```

**Security Best Practices:**

- ✅ Never commit secrets to your repository
- ✅ Use different secrets for different environments (dev/staging/prod)
- ✅ Rotate secrets regularly
- ✅ Use GitHub's secret scanning to detect exposed secrets
- ✅ Limit access to secrets (use environment-specific secrets if needed)

**Testing Without Secrets:**

If you want to test the build without setting up secrets first, you can temporarily remove the secret references from the workflow files. The build should still work if your Next.js app doesn't require database access during build time.

#### Benefits of GitHub Actions Builds

- **No local setup required** - Builds run on GitHub's Windows runners
- **Correct architecture** - Always builds x64/ia32 (not ARM64)
- **Automated** - Runs on every push or release
- **Artifact storage** - Installers stored for 7-30 days
- **Release integration** - Automatically attaches to GitHub Releases

### Progressive Web App Features

The application is configured as a Progressive Web App (PWA) with the following features:
- Offline support
- Installable on mobile devices
- App-like experience
- Caching strategies for:
  - API requests (Network First strategy)
  - Static assets (Cache First strategy)
  - Images and fonts
  - Dynamic content

## PWA Implementation Details

### 1. Configuration

The PWA is implemented using `next-pwa`, a Zero Config PWA plugin for Next.js. The configuration is in `next.config.mjs`:

```javascript
export default withPWA({
    dest: "public",           // Service worker destination
    register: true,           // Auto register service worker
    skipWaiting: true,        // Skip waiting for service worker activation
    disable: process.env.NODE_ENV === "development", // Disable in development
    sw: "/sw.js",            // Service worker path
    // ... other config
})
```

### 2. Web App Manifest

The `public/manifest.json` defines the PWA's appearance and behavior:

```json
{
    "short_name": "posman",
    "name": "Posman retail",
    "description": "Posman retail management system",
    "display": "standalone",
    "orientation": "portrait",
    "theme_color": "#007bff",
    "background_color": "#ffffff"
}
```

### 3. Caching Strategies

The application implements different caching strategies for various types of content:

#### API Requests
```javascript
{
    urlPattern: /^\/api\/.*$/,
    handler: "NetworkFirst",
    options: {
        networkTimeoutSeconds: 10,
        cacheName: "api-cache",
        expiration: {
            maxEntries: 32,
            maxAgeSeconds: 24 * 60 * 60 // 24 hours
        }
    }
}
```

#### Static Assets (Fonts)
```javascript
{
    urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/,
    handler: "CacheFirst",
    options: {
        cacheName: "static-font-assets",
        expiration: {
            maxEntries: 4,
            maxAgeSeconds: 7 * 24 * 60 * 60 // 7 days
        }
    }
}
```

#### Images
```javascript
{
    urlPattern: /\/(.*)\.(?:png|jpg|jpeg|svg|gif|webp)/,
    handler: "CacheFirst",
    options: {
        cacheName: "images",
        expiration: {
            maxEntries: 64,
            maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
        }
    }
}
```

### 4. Service Worker Lifecycle

The service worker implementation:
- Automatically registers in production
- Skips waiting to activate new service workers immediately
- Handles offline functionality
- Manages cache updates and cleanup

### 5. Testing PWA Features

To test PWA functionality:

1. Build and run in production mode:
```bash
npm run build
npm run start
```

2. Open Chrome DevTools:
   - Go to Application tab
   - Check "Service Workers" section
   - Verify "Manifest" section

3. Test offline functionality:
   - Toggle "Offline" in DevTools
   - Verify app continues to work
   - Check cached resources

4. Test installation:
   - Look for install prompt in browser
   - Verify app can be added to home screen
   - Test standalone mode functionality

### 6. PWA Best Practices

When developing features, consider these PWA guidelines:

1. **Offline First**
   - Design features to work without network
   - Implement appropriate fallbacks
   - Use optimistic UI updates

2. **Performance**
   - Minimize initial bundle size
   - Implement proper caching strategies
   - Use appropriate image formats and sizes

3. **Updates**
   - Handle service worker updates gracefully
   - Implement update notification system
   - Manage cache versions properly

4. **Security**
   - Ensure HTTPS in production
   - Implement proper CSP headers
   - Follow PWA security best practices

### Deployment Considerations

1. Database Setup:
   - Ensure MySQL is properly configured
   - Run database migrations
   - Set up proper indexes for performance

2. Environment Configuration:
   - Set NODE_ENV to 'production'
   - Configure secure JWT secret
   - Set up proper database credentials

3. Server Requirements:
   - Node.js v18 or higher
   - Sufficient memory for Node.js runtime
   - Proper network access for database connections

4. Security Considerations:
   - Enable HTTPS in production
   - Set up proper CORS policies
   - Configure rate limiting
   - Implement proper backup strategies

## Database Setup

The application uses MySQL with TypeORM for database management.

### Configuration

Database configuration is located in `src/backend/config/data-source.ts`. The application supports both `DB_*` and `MYSQL_*` environment variable prefixes:

- `DB_HOST` or `MYSQL_HOST` (default: `localhost`)
- `DB_PORT` or `MYSQL_PORT` (default: `3306`)
- `DB_USER` or `MYSQL_USERNAME` (default: `root`)
- `DB_PASSWORD` or `MYSQL_PASSWORD` (default: `password`)
- `DB_NAME` or `MYSQL_DATABASE` (default: `test`)

### Running Migrations

The application uses TypeORM migrations for database schema management. To run migrations:

```bash
# Run all pending migrations
npm run migration:run

# Generate a new migration
npm run migration:generate -- -n YourMigrationName

# Revert the last migration
npm run migration:revert

# Show migration status
npm run migration:show
```

Migration files are located in `src/backend/config/migrations/`. For more details, see the [migrations README](src/backend/config/migrations/README.md).

### Initial Setup

1. Create a MySQL database:
   ```sql
   CREATE DATABASE posman_db;
   ```

2. Configure your `.env` file with database credentials (see Installation section)

3. Run migrations to set up the schema:
   ```bash
   npm run migration:run
   ```

4. (Optional) Seed initial data if seed scripts are available

## Contributing

We welcome contributions to Posman! Here's how you can help:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

- Follow the TypeScript coding standards
- Write meaningful commit messages
- Add appropriate documentation
- Include unit tests for new features
- Ensure all tests pass before submitting PR
- Follow the existing code style and patterns

## License

This project is licensed under the MIT License - see the LICENSE file for details.