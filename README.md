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

This application can be packaged as a Windows x64 desktop application using Electron. The build can be run locally on macOS or Linux (cross-compilation) or via GitHub Actions.

**Supported Windows versions:** Windows 10 and Windows 11 (x64).

### Local build on macOS (cross-compilation)

Cross-compiling on macOS works, but requires manually replacing the two native Node.js modules that are compiled for macOS with their Windows x64 pre-built equivalents. This is a one-time step per checkout.

**Prerequisites:** Node.js v18+, all npm dependencies installed (`npm install`).

#### Step 1 — Build Next.js in standalone mode

```bash
ELECTRON_BUILD=true NODE_ENV=production npm run build
```

Verify the output exists:

```bash
ls .next/standalone/server.js
```

#### Step 2 — Swap native modules for Windows x64 binaries

The standalone `node_modules` ships two macOS-compiled `.node` binaries that will crash on Windows. Replace them with the correct Windows pre-builds.

**a) better-sqlite3** (Electron ABI v140 = Electron 39.x):

```bash
mkdir -p /tmp/win-prebuilds
curl -sL "https://github.com/WiseLibs/better-sqlite3/releases/download/v12.9.0/better-sqlite3-v12.9.0-electron-v140-win32-x64.tar.gz" \
  -o /tmp/win-prebuilds/better-sqlite3-win32.tar.gz
tar -xzf /tmp/win-prebuilds/better-sqlite3-win32.tar.gz -C /tmp/win-prebuilds
cp /tmp/win-prebuilds/build/Release/better_sqlite3.node \
   .next/standalone/node_modules/better-sqlite3/build/Release/better_sqlite3.node
```

**b) sharp** (image processing):

```bash
mkdir -p /tmp/sharp-win && echo '{"name":"tmp","version":"1.0.0"}' > /tmp/sharp-win/package.json
cd /tmp/sharp-win && npm install @img/sharp-win32-x64@0.33.5 --ignore-scripts --force --silent
cd -  # return to project root

rm -rf .next/standalone/node_modules/@img/sharp-darwin-arm64
rm -rf .next/standalone/node_modules/@img/sharp-libvips-darwin-arm64
mkdir -p .next/standalone/node_modules/@img
cp -r /tmp/sharp-win/node_modules/@img/sharp-win32-x64 \
      .next/standalone/node_modules/@img/sharp-win32-x64
```

Verify both are now Windows PE32+ binaries:

```bash
file .next/standalone/node_modules/better-sqlite3/build/Release/better_sqlite3.node
file .next/standalone/node_modules/@img/sharp-win32-x64/lib/sharp-win32-x64.node
# Both should print: PE32+ executable (DLL) (GUI) x86-64, for MS Windows
```

#### Step 3 — Build the Windows zip

```bash
CSC_IDENTITY_AUTO_DISCOVERY=false \
  npx electron-builder --win --x64 \
  --config electron-builder.config.cjs \
  --config.win.target=zip \
  --config.npmRebuild=false \
  --publish never
```

> **Why zip and not NSIS?** The NSIS installer format requires `wine` to cross-compile on macOS. The zip is equivalent — users extract it and run `JK PosMan.exe` directly. To build a proper `.exe` installer locally, install `wine`: `brew install --cask wine-stable && brew install nsis`, then remove `--config.win.target=zip` from the command above.

#### Step 4 — Verify the output

```bash
ls -lh dist-electron/*.zip          # ~150 MB
find dist-electron/win-unpacked/resources -name "*.node"
# Should list only win32-x64 .node files
```

The installer is at `dist-electron/JK PosMan-0.1.0-win.zip`.  
Extract the zip on a Windows machine and run `JK PosMan.exe`.

---

### Updating native module versions

If you upgrade `better-sqlite3` or `sharp`, update the versions in Step 2:

| Dependency | How to find the right prebuild |
|---|---|
| `better-sqlite3` | Check `node_modules/better-sqlite3/package.json` for `version`. Get Electron ABI via `node -e "require('node-abi').getAbi('<electron-version>', 'electron')"`. Download from [GitHub releases](https://github.com/WiseLibs/better-sqlite3/releases). |
| `sharp` | Check `node_modules/sharp/package.json` for the `@img/sharp-win32-x64` version under `optionalDependencies`. |

---

### Building via GitHub Actions (recommended for releases)

Push to `main` or open a pull request — the CI workflow builds the Windows installer automatically and uploads it as an artifact.

**To trigger manually:**
1. Go to the **Actions** tab in your GitHub repository
2. Select the Windows build workflow
3. Click **Run workflow**
4. Download the artifact from the workflow run

**To create a release:**
```bash
git tag v1.0.0
git push origin v1.0.0
```
The workflow will build and attach the installer to a GitHub Release automatically.

---

### Windows debugging

If the app fails to launch on Windows, check logs at:

```
%LOCALAPPDATA%\JK PosMan\logs\
```

Via PowerShell:
```powershell
cd $env:LOCALAPPDATA\JK PosMan\logs
Get-Content (Get-ChildItem -Filter "app-*.log" | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName
```

Common issues:
- **Blank screen / app won't start**: `.next/standalone` was not copied correctly — verify Step 4 above shows `.node` files in `win-unpacked/resources`.
- **Port conflict**: The app uses port 8817 by default. Kill any process holding it.
- **Antivirus blocking**: Add an exception for the app directory.

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

The app now performs startup DB bootstrap checks automatically on each startup.

1. Configure your `.env` file with database credentials (see Installation section).
2. Start the app.
3. On first run:
   - If DB server is unreachable, login shows guided troubleshooting steps.
   - If DB server is reachable but database is missing, login shows an initialization prompt.
   - Clicking **Run Initial Setup** creates the DB (if missing), runs migrations, and seeds default roles/permissions/admin via migration scripts.

### Startup Bootstrap API (internal)

- `GET /api/system/setup-status` - Returns setup state (`ready`, `db_server_unavailable`, `initialization_required`, `initializing`, `failed`)
- `POST /api/system/setup-initialize` - Runs first-time DB initialization flow

### Bootstrap Troubleshooting

- Verify `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` (or `MYSQL_*` equivalents).
- Ensure MySQL service is running and reachable from the app host.
- For admin seed creation, ensure admin env vars are set (for example `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and related fields used by the seed migration).
- You can still run migrations manually:
  ```bash
  npm run migration:run
  ```

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