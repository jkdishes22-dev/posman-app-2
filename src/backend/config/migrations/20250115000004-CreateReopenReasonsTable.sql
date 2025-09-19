-- Create reopen_reasons table
CREATE TABLE IF NOT EXISTS reopen_reasons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reason_key VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default reopen reasons
INSERT INTO reopen_reasons (reason_key, name, description, sort_order) VALUES
('mpesa_payment_unconfirmed', 'M-Pesa Payment Unconfirmed', 'M-Pesa payment could not be verified', 1),
('cash_payment_disputed', 'Cash Payment Disputed', 'Customer disputes cash payment amount', 2),
('payment_refund_required', 'Payment Refund Required', 'Refund needed for overpayment', 3),
('customer_complaint', 'Customer Complaint', 'Customer complaint about bill accuracy', 4),
('system_error', 'System Error', 'Technical error in bill processing', 5),
('other', 'Other', 'Other reason not listed above', 6)
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);
