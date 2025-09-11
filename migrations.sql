-- Migration 1: Add station_id to bill table
-- Add station_id column to bill table
ALTER TABLE `bill` 
ADD COLUMN `station_id` int unsigned NULL;

-- Add foreign key constraint
ALTER TABLE `bill` 
ADD CONSTRAINT `fk_bill_station` 
FOREIGN KEY (`station_id`) REFERENCES `station`(`id`) 
ON DELETE SET NULL ON UPDATE CASCADE;

-- Add index for better performance
CREATE INDEX `idx_bill_station` ON `bill` (`station_id`);

-- Migration 2: Add is_default to pricelist table
-- Add is_default column to pricelist table
ALTER TABLE `pricelist` 
ADD COLUMN `is_default` tinyint(1) NOT NULL DEFAULT 0;

-- Add unique index to ensure only one default pricelist per station
-- Note: MySQL doesn't support partial indexes like PostgreSQL, so we'll use a regular index
-- and handle uniqueness in the application layer
CREATE INDEX `idx_pricelist_is_default` ON `pricelist` (`is_default`);

-- Add index for station_id + is_default combination
CREATE INDEX `idx_pricelist_station_default` ON `pricelist` (`station_id`, `is_default`);
