-- Create bill_void_request table for tracking void bill requests
CREATE TABLE IF NOT EXISTS `bill_void_request` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bill_id` int NOT NULL,
  `initiated_by` int NOT NULL,
  `approved_by` int DEFAULT NULL,
  `status` enum('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
  `reason` text,
  `approval_notes` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `approved_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `paper_approval_received` tinyint(1) NOT NULL DEFAULT '0',
  `paper_approval_date` datetime DEFAULT NULL,
  `paper_approval_notes` text,
  PRIMARY KEY (`id`),
  KEY `IDX_bill_void_request_bill_id_status` (`bill_id`,`status`),
  KEY `IDX_bill_void_request_initiated_by_created_at` (`initiated_by`,`created_at`),
  KEY `IDX_bill_void_request_approved_by_approved_at` (`approved_by`,`approved_at`),
  CONSTRAINT `FK_bill_void_request_bill_id` FOREIGN KEY (`bill_id`) REFERENCES `bill` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FK_bill_void_request_initiated_by` FOREIGN KEY (`initiated_by`) REFERENCES `user` (`id`),
  CONSTRAINT `FK_bill_void_request_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `user` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Add VOIDED status to bill table if it doesn't exist
ALTER TABLE `bill` MODIFY COLUMN `status` enum('pending','cancelled','submitted','closed','voided') DEFAULT NULL;

-- Add VOIDED status to bill_item table if it doesn't exist  
ALTER TABLE `bill_item` MODIFY COLUMN `status` enum('active','submitted','voided') DEFAULT NULL;

-- Log the migration
INSERT INTO settings (`key`, value)
VALUES ('bill_void_request_migration_20250115', '"completed"')
ON DUPLICATE KEY UPDATE value = '"completed"';
