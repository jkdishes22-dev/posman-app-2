-- Migration: Add reopen_bill_request table
-- Description: Creates table to track bill reopen requests with reasons and audit trail

CREATE TABLE IF NOT EXISTS `reopen_bill_request` (
    `id` int NOT NULL AUTO_INCREMENT,
    `bill_id` int NOT NULL,
    `reopened_by` int NOT NULL,
    `reason` enum('mpesa_payment_unconfirmed','cash_payment_disputed','payment_refund_required','customer_complaint','system_error','other') NOT NULL DEFAULT 'other',
    `description` text,
    `notes` text,
    `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `IDX_reopen_bill_request_bill_id_created_at` (`bill_id`, `created_at`),
    KEY `IDX_reopen_bill_request_reopened_by_created_at` (`reopened_by`, `created_at`),
    CONSTRAINT `FK_reopen_bill_request_bill_id` FOREIGN KEY (`bill_id`) REFERENCES `bill` (`id`) ON DELETE CASCADE,
    CONSTRAINT `FK_reopen_bill_request_reopened_by` FOREIGN KEY (`reopened_by`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
