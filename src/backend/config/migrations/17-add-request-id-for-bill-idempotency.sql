-- Add request_id column to bill table for idempotency
-- This allows duplicate bill creation requests to return the same bill

ALTER TABLE `bill` 
ADD COLUMN `request_id` VARCHAR(255) NULL UNIQUE;

-- Create index for faster lookups
CREATE INDEX `IDX_bill_request_id` ON `bill` (`request_id`);

-- Log the migration
INSERT INTO settings (`key`, value)
VALUES ('bill_idempotency_migration_20250115', '"completed"')
ON DUPLICATE KEY UPDATE value = '"completed"';
