-- Create reopen_reasons table
CREATE TABLE IF NOT EXISTS reopen_reasons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reason_key VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default reopen reasons
INSERT INTO reopen_reasons (reason_key, name, description, sort_order) VALUES
('mpesa_payment_unconfirmed', 'M-Pesa Payment Unconfirmed', 'M-Pesa payment could not be verified or confirmed', 1),
('cash_payment_disputed', 'Cash Payment Disputed', 'Customer disputes the cash payment amount or method', 2),
('payment_refund_required', 'Payment Refund Required', 'Refund needed for overpayment or incorrect payment', 3),
('customer_complaint', 'Customer Complaint', 'Customer complaint about bill accuracy or service', 4),
('system_error', 'System Error', 'Technical error in bill processing or payment system', 5),
('staff_error', 'Staff Error', 'Error made by staff member during bill processing', 6),
('payment_method_issue', 'Payment Method Issue', 'Issue with the selected payment method', 7),
('bill_calculation_error', 'Bill Calculation Error', 'Error in bill total calculation or item pricing', 8),
('other', 'Other', 'Other reason not listed above', 99);

-- Create index for better query performance
CREATE INDEX idx_reopen_reasons_active ON reopen_reasons(is_active, sort_order);
