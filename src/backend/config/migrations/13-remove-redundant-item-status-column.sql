-- Migration: Remove redundant item_status column
-- Following user feedback to consolidate status tracking into single status column

-- Drop the redundant item_status column
ALTER TABLE `bill_item` DROP COLUMN `item_status`;

-- Drop the index for item_status
DROP INDEX `IDX_bill_item_status` ON `bill_item`;

-- Update existing bill_item records to have 'submitted' status for active items
-- (assuming they were previously 'active' in item_status)
UPDATE `bill_item` SET `status` = 'submitted' WHERE `status` = 'active';

-- Log the migration
INSERT INTO settings (`key`, value)
VALUES ('remove_redundant_item_status_migration_20250115', '"completed"')
ON DUPLICATE KEY UPDATE value = '"completed"';
