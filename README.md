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
git clone https://github.com/yourusername/posman-app.git
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
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=posman_db

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

The application uses MySQL with TypeORM for database management. Refer to the `src/backend/config/data-source.ts` file for database configuration.

To ensure proper database initialization across different serverless instances, we have implemented centralized repository management and initialization checking. Refer to the `src/backend/utils/metadata-hack.ts` and `src/backend/datasource.ts` files for more details.

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