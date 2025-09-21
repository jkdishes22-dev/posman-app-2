-- Migration: Implement Bill Voiding and Reopening Features
-- Following Cursor Rules 4.1: Database Schema Rules

-- Add reopening tracking columns to bill table
ALTER TABLE `bill` 
ADD COLUMN `reopen_reason` TEXT NULL,
ADD COLUMN `reopened_by` INT NULL,
ADD COLUMN `reopened_at` DATETIME NULL;

-- Add voiding tracking columns to bill_item table
ALTER TABLE `bill_item` 
ADD COLUMN `status` ENUM('pending', 'submitted', 'void_pending', 'voided', 'closed', 'quantity_change_request', 'deleted') DEFAULT 'pending',
ADD COLUMN `void_reason` TEXT NULL,
ADD COLUMN `void_requested_by` INT NULL,
ADD COLUMN `void_requested_at` DATETIME NULL,
ADD COLUMN `void_approved_by` INT NULL,
ADD COLUMN `void_approved_at` DATETIME NULL;

-- Add foreign key constraints for new columns
ALTER TABLE `bill` 
ADD CONSTRAINT `FK_bill_reopened_by` FOREIGN KEY (`reopened_by`) REFERENCES `user` (`id`) ON DELETE SET NULL;

ALTER TABLE `bill_item` 
ADD CONSTRAINT `FK_bill_item_void_requested_by` FOREIGN KEY (`void_requested_by`) REFERENCES `user` (`id`) ON DELETE SET NULL,
ADD CONSTRAINT `FK_bill_item_void_approved_by` FOREIGN KEY (`void_approved_by`) REFERENCES `user` (`id`) ON DELETE SET NULL;

-- Add indexes for performance
CREATE INDEX `IDX_bill_reopened_by_created_at` ON `bill` (`reopened_by`, `reopened_at`);
CREATE INDEX `IDX_bill_status` ON `bill_item` (`status`);
CREATE INDEX `IDX_bill_item_void_requested_by` ON `bill_item` (`void_requested_by`, `void_requested_at`);
CREATE INDEX `IDX_bill_item_void_approved_by` ON `bill_item` (`void_approved_by`, `void_approved_at`);

-- Update existing bill_item records to have 'pending' status
UPDATE `bill_item` SET `status` = 'pending' WHERE `status` IS NULL;

-- Log the migration
INSERT INTO settings (`key`, value)
VALUES ('bill_voiding_reopening_migration_20250115', '"completed"')
ON DUPLICATE KEY UPDATE value = '"completed"';
