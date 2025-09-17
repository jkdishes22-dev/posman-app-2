-- Add notes column to bill table for overpayment tracking
ALTER TABLE bill ADD COLUMN notes TEXT NULL;

-- Add index for notes column for better query performance
CREATE INDEX idx_bill_notes ON bill(notes(255));
