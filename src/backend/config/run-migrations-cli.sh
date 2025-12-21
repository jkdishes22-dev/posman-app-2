#!/bin/bash
# Production-ready migration runner using TypeORM CLI
# This is the most robust approach for production environments

set -e  # Exit on error

echo "🚀 Starting database migrations using TypeORM CLI..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found. Using environment variables from system."
fi

# Check if required environment variables are set
if [ -z "$DB_NAME" ] && [ -z "$MYSQL_DATABASE" ]; then
    echo "❌ Error: DB_NAME or MYSQL_DATABASE must be set"
    exit 1
fi

# Use TypeORM CLI with the data-source.cjs file
# This ensures migrations are loaded in the correct CommonJS context
echo "📦 Running migrations with TypeORM CLI..."
echo ""

npx typeorm-ts-node-commonjs migration:run \
    -d src/backend/config/data-source.cjs

if [ $? -eq 0 ]; then
    echo "✅ Migrations completed successfully!"
else
    echo "❌ Migration failed!"
    exit 1
fi

