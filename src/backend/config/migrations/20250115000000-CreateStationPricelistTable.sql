-- Migration: Convert 1:1 station-pricelist relationship to M:M
-- This script transforms existing data to the new architecture

-- Step 1: Create the new junction table
CREATE TABLE IF NOT EXISTS `station_pricelist` (
  `id` int NOT NULL AUTO_INCREMENT,
  `station_id` int unsigned NOT NULL,
  `pricelist_id` int NOT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT '0',
  `status` enum('active','inactive','under_review') NOT NULL DEFAULT 'active',
  `notes` text,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `IDX_station_pricelist_unique` (`station_id`,`pricelist_id`),
  KEY `IDX_station_pricelist_station_default` (`station_id`,`is_default`),
  KEY `IDX_station_pricelist_pricelist_status` (`pricelist_id`,`status`),
  KEY `FK_station_pricelist_station` (`station_id`),
  KEY `FK_station_pricelist_pricelist` (`pricelist_id`),
  CONSTRAINT `FK_station_pricelist_station` FOREIGN KEY (`station_id`) REFERENCES `station` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_station_pricelist_pricelist` FOREIGN KEY (`pricelist_id`) REFERENCES `pricelist` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Step 2: Migrate existing data from pricelist.station_id to station_pricelist
INSERT INTO `station_pricelist` (
  `station_id`, 
  `pricelist_id`, 
  `is_default`, 
  `status`, 
  `created_at`, 
  `updated_at`, 
  `created_by`, 
  `updated_by`
)
SELECT 
  p.station_id,
  p.id as pricelist_id,
  p.is_default,
  CASE 
    WHEN p.status = 'active' THEN 'active'
    WHEN p.status = 'inactive' THEN 'inactive'
    ELSE 'active'
  END as status,
  p.created_at,
  p.updated_at,
  p.created_by,
  p.updated_by
FROM `pricelist` p
WHERE p.station_id IS NOT NULL;

-- Step 3: Add description column to pricelist table
ALTER TABLE `pricelist` 
ADD COLUMN `description` text DEFAULT NULL;

-- Step 4: Add description column to station table  
ALTER TABLE `station` 
ADD COLUMN `description` text DEFAULT NULL;

-- Step 5: Update pricelist status enum to include 'under_review'
ALTER TABLE `pricelist` 
MODIFY COLUMN `status` enum('active','inactive','under_review') DEFAULT 'active';

-- Step 6: Remove the old station_id column from pricelist table
-- Note: This will be done after confirming the migration worked correctly
-- ALTER TABLE `pricelist` DROP COLUMN `station_id`;

-- Step 7: Verify the migration
-- Check that all pricelists with station_id have been migrated
SELECT 
  'Pricelists with station_id before migration' as check_type,
  COUNT(*) as count
FROM `pricelist` 
WHERE `station_id` IS NOT NULL

UNION ALL

SELECT 
  'Station-pricelist relationships created' as check_type,
  COUNT(*) as count
FROM `station_pricelist`

UNION ALL

SELECT 
  'Default pricelists migrated' as check_type,
  COUNT(*) as count
FROM `station_pricelist` 
WHERE `is_default` = 1;
