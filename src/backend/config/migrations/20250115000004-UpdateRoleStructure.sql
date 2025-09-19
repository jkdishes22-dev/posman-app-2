-- Update role structure for industry-agnostic ACL system
-- This migration updates role names and adds the supervisor role

-- Step 1: Add the new supervisor role
INSERT INTO roles (NAME, created_at, updated_at, created_by, updated_by) 
VALUES ('supervisor', NOW(), NULL, NULL, NULL);

-- Step 2: Update existing role names
-- Update 'user' to 'sales'
UPDATE roles 
SET NAME = 'sales', updated_at = NOW() 
WHERE NAME = 'user';

-- Step 3: Remove 'waiter' role and reassign users to 'sales'
-- First, update all user_roles that reference waiter (role_id = 4) to sales (role_id = 2)
UPDATE user_roles 
SET role_id = 2, updated_at = NOW() 
WHERE role_id = 4;

-- Now delete the waiter role
DELETE FROM roles WHERE NAME = 'waiter';

-- Step 4: Update any references in the codebase
-- Note: This migration handles database changes only
-- Frontend and backend code updates will be handled separately

-- Step 5: Verify the new role structure
-- Expected roles after migration:
-- 1. admin
-- 2. sales (formerly user)
-- 3. cashier  
-- 4. supervisor (new)
-- 5. storekeeper

-- Log the migration
INSERT INTO settings (`key`, value) 
VALUES ('role_migration_20250115', '"completed"')
ON DUPLICATE KEY UPDATE value = '"completed"';
