-- Migration: Add Quantity Change Request Support
-- This migration adds support for quantity change requests in bill items

-- Step 1: Add new enum value to the 'status' column
ALTER TABLE `bill_item` MODIFY COLUMN `status` ENUM('pending', 'submitted', 'closed', 'void_pending', 'voided', 'quantity_change_request', 'deleted') DEFAULT 'pending';

-- Step 2: Add quantity change tracking columns
ALTER TABLE `bill_item` ADD COLUMN `requested_quantity` INT NULL AFTER `void_approved_at`;
ALTER TABLE `bill_item` ADD COLUMN `quantity_change_reason` TEXT NULL AFTER `requested_quantity`;
ALTER TABLE `bill_item` ADD COLUMN `quantity_change_requested_by` INT NULL AFTER `quantity_change_reason`;
ALTER TABLE `bill_item` ADD COLUMN `quantity_change_requested_at` DATETIME NULL AFTER `quantity_change_requested_by`;
ALTER TABLE `bill_item` ADD COLUMN `quantity_change_approved_by` INT NULL AFTER `quantity_change_requested_at`;
ALTER TABLE `bill_item` ADD COLUMN `quantity_change_approved_at` DATETIME NULL AFTER `quantity_change_approved_by`;
