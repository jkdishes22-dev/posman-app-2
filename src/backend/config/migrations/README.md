# Database Migrations

This directory contains all database migration files for the POS application.

## Migration Standard

All migrations follow the [TypeORM documented standard](https://typeorm.io/docs/migrations/generating/) using `MigrationInterface`:

```javascript
/**
 * @typedef {import('typeorm').MigrationInterface} MigrationInterface
 * @typedef {import('typeorm').QueryRunner} QueryRunner
 */

const { QueryRunner } = require("typeorm");

/**
 * @class
 * @implements {MigrationInterface}
 */
class YourMigrationName {
    constructor() {
        this.name = 'YourMigrationName';
    }

    async up(queryRunner) {
        // Migration up logic
    }

    async down(queryRunner) {
        // Migration down logic
    }
}

module.exports = YourMigrationName;
```

## File Naming Convention

Migrations are named with the following format:
```
{timestamp}-{DescriptiveName}.cjs
```

Examples:
- `1700000000000-SyncAllEntities.cjs`
- `1700000000003-SeedRoles.cjs`

## Running Migrations

### Production (Recommended)

Use the TypeORM CLI with the CommonJS data source:

```bash
npx typeorm-ts-node-commonjs migration:run -d src/backend/config/data-source.cjs
```

Or use the provided shell script:

```bash
./src/backend/config/run-migrations-cli.sh
```

### Development

For development, you can use:

```bash
npx tsx --env-file=.env src/backend/config/run-migrations.ts
```

**Note:** The TypeORM CLI approach is more robust and recommended for all environments.

## Environment Variables

Ensure your `.env` file contains:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=your_database_name
```

Or use the `MYSQL_*` prefix:

```env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USERNAME=your_username
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=your_database_name
```

### Admin User Seeding

The `SeedAdminUser` migration creates an initial admin user for first-time login. You can configure the credentials via environment variables:

```env
# Admin user credentials (optional - defaults shown)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
ADMIN_FIRST_NAME=System
ADMIN_LAST_NAME=Administrator
```

**Security Note:** The default password should be changed immediately after first login. The password is hashed using bcrypt (10 rounds) before storage.

## Creating New Migrations

### Option 1: Generate from Entity Changes (Recommended)

```bash
npx typeorm-ts-node-commonjs migration:generate \
    -d src/backend/config/data-source.cjs \
    src/backend/config/migrations/YourMigrationName
```

This will automatically detect changes in your entities and generate the migration.

### Option 2: Create Manually

Create a new file following the standard pattern above. Make sure to:
- Use JSDoc to document `MigrationInterface`
- Include `up()` and `down()` methods
- Set the `name` property in the constructor
- Export the class as CommonJS module

## Migration Best Practices

1. **Idempotent Migrations**: Always check if columns/indexes/constraints exist before creating them
2. **Rollback Support**: Always implement the `down()` method for rollback capability
3. **Data Safety**: Use transactions when possible for data migrations
4. **Testing**: Test migrations on a development database before production

## Current Migrations

- `1700000000000-SyncAllEntities.cjs` - Creates all database tables from entities (includes all columns, indexes, and foreign keys)
- `1700000000003-SeedRoles.cjs` - Seeds default roles (admin, supervisor, sales, cashier, storekeeper) from role-permissions.ts
- `1700000000004-SeedPermissionScopes.cjs` - Seeds permission scopes (system, billing, financial, inventory, stations, pricelists) from PERMISSION_CATEGORIES
- `1700000000005-SeedPermissions.cjs` - Seeds all permissions from ROLE_PERMISSIONS and maps them to their appropriate scopes
- `1700000000006-SeedAdminUser.cjs` - Seeds initial admin user for first-time login (credentials configurable via environment variables)
- `1700000000007-AssignPermissionsToRoles.cjs` - Assigns all permissions to their respective roles in the `role_permissions` table based on ROLE_PERMISSIONS configuration (ensures admin has full permission management capabilities)

## Troubleshooting

### Error: "MigrationInterface is not a constructor"

- Ensure migrations follow the documented standard (no `extends`, just JSDoc)
- Use the TypeORM CLI approach instead of direct TypeScript execution

### Error: "Duplicate column/index/constraint"

- Migrations should be idempotent - check if resources exist before creating
- See existing migrations for examples of idempotent patterns

### Error: "Unknown database"

- Check that `DB_NAME` or `MYSQL_DATABASE` is set correctly
- Ensure the database exists in MySQL

## References

- [TypeORM Migration Documentation](https://typeorm.io/docs/migrations)
- [TypeORM Migration Generation](https://typeorm.io/docs/migrations/generating/)
