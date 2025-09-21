-- Migration: Update Bill Item Status Flow (Fixed)
-- Following consolidated status column approach

-- First, let's see what data we have
SELECT 'Current data before migration:' as info;
SELECT status, item_status, COUNT(*) as count FROM bill_item GROUP BY status, item_status;

-- Step 1: Add new status values to the enum
ALTER TABLE `bill_item` 
MODIFY COLUMN `status` ENUM('active', 'submitted', 'voided', 'pending', 'closed', 'void_pending', 'deleted') DEFAULT 'pending';

-- Step 2: Update existing data to use the new consolidated status
-- Convert 'active' status to 'pending' (new default for created items)
UPDATE `bill_item` SET `status` = 'pending' WHERE `status` = 'active';

-- Convert items with 'submitted' status and 'active' item_status to 'submitted'
UPDATE `bill_item` SET `status` = 'submitted' WHERE `status` = 'submitted' AND `item_status` = 'active';

-- Convert items with 'void_pending' item_status to 'void_pending' status
UPDATE `bill_item` SET `status` = 'void_pending' WHERE `item_status` = 'void_pending';

-- Convert items with 'voided' item_status to 'voided' status
UPDATE `bill_item` SET `status` = 'voided' WHERE `item_status` = 'voided';

-- Step 3: Drop the redundant item_status column
ALTER TABLE `bill_item` DROP COLUMN `item_status`;

-- Step 4: Drop the old index for item_status
DROP INDEX `IDX_bill_item_status` ON `bill_item`;

-- Step 5: Create new index for the consolidated status column
CREATE INDEX `IDX_bill_item_status` ON `bill_item` (`status`);

-- Step 6: Update the enum to remove old values and set proper default
ALTER TABLE `bill_item` 
MODIFY COLUMN `status` ENUM('pending', 'submitted', 'closed', 'void_pending', 'voided', 'deleted') DEFAULT 'pending';

-- Step 7: Show final data
SELECT 'Final data after migration:' as info;
SELECT status, COUNT(*) as count FROM bill_item GROUP BY status;

-- Log the migration
INSERT INTO settings (`key`, value)
VALUES ('update_bill_item_status_flow_migration_20250115', '"completed"')
ON DUPLICATE KEY UPDATE value = '"completed"';
