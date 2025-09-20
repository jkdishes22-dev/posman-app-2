-- Migration: Update Bill Item Status Flow (Simple)
-- Following consolidated status column approach

-- Step 1: Add new status values to the enum
ALTER TABLE `bill_item` 
MODIFY COLUMN `status` ENUM('active', 'submitted', 'voided', 'pending', 'closed', 'void_pending', 'deleted') DEFAULT 'pending';

-- Step 2: Update existing data to use the new consolidated status
-- Convert 'submitted' + 'active' item_status to 'submitted' status
UPDATE `bill_item` SET `status` = 'submitted' WHERE `status` = 'submitted' AND `item_status` = 'active';

-- Convert 'submitted' + 'void_pending' item_status to 'void_pending' status  
UPDATE `bill_item` SET `status` = 'void_pending' WHERE `status` = 'submitted' AND `item_status` = 'void_pending';

-- Convert 'submitted' + 'voided' item_status to 'voided' status
UPDATE `bill_item` SET `status` = 'voided' WHERE `status` = 'submitted' AND `item_status` = 'voided';

-- Step 3: Drop the redundant item_status column
ALTER TABLE `bill_item` DROP COLUMN `item_status`;

-- Step 4: Try to drop the old index (ignore if it doesn't exist)
SET @sql = 'DROP INDEX `IDX_bill_item_status` ON `bill_item`';
SET @sql = IF((SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE table_schema = DATABASE() AND table_name = 'bill_item' AND index_name = 'IDX_bill_item_status') > 0, @sql, 'SELECT "Index does not exist"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 5: Create new index for the consolidated status column
CREATE INDEX `IDX_bill_item_status` ON `bill_item` (`status`);

-- Step 6: Update the enum to remove old values and set proper default
ALTER TABLE `bill_item` 
MODIFY COLUMN `status` ENUM('pending', 'submitted', 'closed', 'void_pending', 'voided', 'deleted') DEFAULT 'pending';

-- Log the migration
INSERT INTO settings (`key`, value)
VALUES ('update_bill_item_status_flow_migration_20250115', '"completed"')
ON DUPLICATE KEY UPDATE value = '"completed"';
