-- Migration: Fix bill status column type
-- Description: Changes bill.status from BLOB to ENUM with proper values

-- First, update any existing data to ensure it matches the enum values
UPDATE bill SET status = 'pending' WHERE status IS NULL OR status = '';
UPDATE bill SET status = 'submitted' WHERE status = 'submitted';
UPDATE bill SET status = 'closed' WHERE status = 'closed';
UPDATE bill SET status = 'voided' WHERE status = 'voided';
UPDATE bill SET status = 'cancelled' WHERE status = 'cancelled';
UPDATE bill SET status = 'reopened' WHERE status = 'reopened';

-- Change the column type from BLOB to ENUM
ALTER TABLE bill 
MODIFY COLUMN status ENUM('pending', 'cancelled', 'submitted', 'closed', 'voided', 'reopened') NULL;
