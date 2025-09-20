-- Migration: Update Bill Item Status Flow
-- Following consolidated status column approach

-- Update existing bill_item records to use the new status flow
-- Convert old statuses to new consolidated statuses
UPDATE `bill_item` SET `status` = 'pending' WHERE `status` = 'active';
UPDATE `bill_item` SET `status` = 'submitted' WHERE `status` = 'submitted' AND `item_status` = 'active';
UPDATE `bill_item` SET `status` = 'void_pending' WHERE `item_status` = 'void_pending';
UPDATE `bill_item` SET `status` = 'voided' WHERE `item_status` = 'voided';

-- Drop the redundant item_status column
ALTER TABLE `bill_item` DROP COLUMN `item_status`;

-- Drop the index for item_status
DROP INDEX `IDX_bill_item_status` ON `bill_item`;

-- Update the status column enum to include all new statuses
ALTER TABLE `bill_item` 
MODIFY COLUMN `status` ENUM('pending', 'submitted', 'closed', 'void_pending', 'voided', 'deleted') DEFAULT 'pending';

-- Create new index for the consolidated status column
CREATE INDEX `IDX_bill_item_status` ON `bill_item` (`status`);

-- Log the migration
INSERT INTO settings (`key`, value)
VALUES ('update_bill_item_status_flow_migration_20250115', '"completed"')
ON DUPLICATE KEY UPDATE value = '"completed"';
