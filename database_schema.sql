-- =====================================================
-- POS Management System Database Schema
-- Generated from TypeORM entities
-- =====================================================

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- =====================================================
-- CORE SYSTEM TABLES
-- =====================================================

-- Permission Scopes
CREATE TABLE permission_scope (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    created_by INTEGER,
    updated_by INTEGER
);

-- Permissions
CREATE TABLE permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    scope_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    created_by INTEGER,
    updated_by INTEGER,
    FOREIGN KEY (scope_id) REFERENCES permission_scope(id)
);

-- Roles
CREATE TABLE roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    created_by INTEGER,
    updated_by INTEGER
);

-- Users
CREATE TABLE user (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(255) NOT NULL UNIQUE,
    lastName VARCHAR(255) NOT NULL,
    firstName VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    refreshToken TEXT,
    is_locked BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    created_by INTEGER,
    updated_by INTEGER
);

-- User-Role Junction Table (with BaseEntity columns)
CREATE TABLE user_roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    role_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    created_by INTEGER,
    updated_by INTEGER,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    UNIQUE(user_id, role_id)
);

-- Role-Permission Junction Table (with BaseEntity columns)
CREATE TABLE role_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role_id INTEGER NOT NULL,
    permission_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    created_by INTEGER,
    updated_by INTEGER,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
    UNIQUE(role_id, permission_id)
);

-- =====================================================
-- STATION AND PRICELIST MANAGEMENT
-- =====================================================

-- Stations
CREATE TABLE station (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'inactive' CHECK (status IN ('active', 'inactive')),
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    created_by INTEGER,
    updated_by INTEGER
);

-- User Stations
CREATE TABLE user_station (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    station_id INTEGER NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    created_by INTEGER,
    updated_by INTEGER,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
    FOREIGN KEY (station_id) REFERENCES station(id) ON DELETE CASCADE
);

-- Pricelists
CREATE TABLE pricelist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'under_review')),
    is_default BOOLEAN DEFAULT FALSE,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    created_by INTEGER,
    updated_by INTEGER
);

-- Station-Pricelist Junction Table
CREATE TABLE station_pricelist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    station_id INTEGER NOT NULL,
    pricelist_id INTEGER NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'under_review')),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    created_by INTEGER,
    updated_by INTEGER,
    FOREIGN KEY (station_id) REFERENCES station(id) ON DELETE CASCADE,
    FOREIGN KEY (pricelist_id) REFERENCES pricelist(id) ON DELETE CASCADE,
    UNIQUE(station_id, pricelist_id)
);

-- =====================================================
-- MENU AND INVENTORY MANAGEMENT
-- =====================================================

-- Categories
CREATE TABLE category (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'deleted'))
);

-- Items
CREATE TABLE item (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('ACTIVE', 'DELETED')),
    item_category_id INTEGER,
    default_unit_id INTEGER,
    is_group BOOLEAN DEFAULT FALSE,
    is_stock BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (item_category_id) REFERENCES category(id)
);

-- Item Groups (Many-to-Many relationship for items)
CREATE TABLE item_group (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL,
    sub_item_id INTEGER NOT NULL,
    portion_size DECIMAL(10,2) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    created_by INTEGER,
    updated_by INTEGER,
    FOREIGN KEY (item_id) REFERENCES item(id) ON DELETE CASCADE,
    FOREIGN KEY (sub_item_id) REFERENCES item(id) ON DELETE CASCADE
);

-- Pricelist Items
CREATE TABLE pricelist_item (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pricelist_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    price DOUBLE DEFAULT 0.0,
    currency VARCHAR(10) CHECK (currency IN ('USD', 'KES')),
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    created_by INTEGER,
    updated_by INTEGER,
    FOREIGN KEY (pricelist_id) REFERENCES pricelist(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES item(id) ON DELETE CASCADE
);

-- Inventory Items
CREATE TABLE inventory_item (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    created_by INTEGER,
    updated_by INTEGER,
    FOREIGN KEY (item_id) REFERENCES item(id) ON DELETE CASCADE
);

-- =====================================================
-- BILLING SYSTEM
-- =====================================================

-- Bills
CREATE TABLE bill (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    status VARCHAR(20) CHECK (status IN ('pending', 'submitted', 'closed', 'reopened')),
    total DECIMAL(10,2),
    cleared_by INTEGER,
    cleared_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    created_by INTEGER,
    request_id VARCHAR(255) UNIQUE,
    updated_by INTEGER,
    station_id INTEGER,
    reopen_reason TEXT,
    reopened_by INTEGER,
    reopened_at DATETIME,
    notes TEXT,
    FOREIGN KEY (user_id) REFERENCES user(id),
    FOREIGN KEY (cleared_by) REFERENCES user(id),
    FOREIGN KEY (reopened_by) REFERENCES user(id),
    FOREIGN KEY (station_id) REFERENCES station(id)
);

-- Bill Items
CREATE TABLE bill_item (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER,
    bill_id INTEGER,
    quantity INTEGER DEFAULT 0,
    subtotal DOUBLE DEFAULT 0.0,
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'void_pending', 'voided', 'closed', 'quantity_change_request', 'deleted')),
    void_reason TEXT,
    void_requested_by INTEGER,
    void_requested_at DATETIME,
    void_approved_by INTEGER,
    void_approved_at DATETIME,
    requested_quantity INTEGER,
    quantity_change_reason TEXT,
    quantity_change_requested_by INTEGER,
    quantity_change_requested_at DATETIME,
    quantity_change_approved_by INTEGER,
    quantity_change_approved_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    FOREIGN KEY (item_id) REFERENCES item(id),
    FOREIGN KEY (bill_id) REFERENCES bill(id) ON DELETE CASCADE,
    FOREIGN KEY (void_requested_by) REFERENCES user(id),
    FOREIGN KEY (void_approved_by) REFERENCES user(id),
    FOREIGN KEY (quantity_change_requested_by) REFERENCES user(id),
    FOREIGN KEY (quantity_change_approved_by) REFERENCES user(id)
);

-- Payments
CREATE TABLE payment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    debit_amount DOUBLE DEFAULT 0.0,
    credit_amount DOUBLE DEFAULT 0.0,
    payment_type VARCHAR(20) NOT NULL CHECK (payment_type IN ('CASH', 'MPESA')),
    paid_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reference VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER NOT NULL,
    updated_by INTEGER
);

-- Bill Payments
CREATE TABLE bill_payment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_id INTEGER NOT NULL,
    payment_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER NOT NULL,
    updated_by INTEGER,
    FOREIGN KEY (bill_id) REFERENCES bill(id) ON DELETE CASCADE,
    FOREIGN KEY (payment_id) REFERENCES payment(id) ON DELETE CASCADE
);

-- =====================================================
-- BILL MANAGEMENT FEATURES
-- =====================================================

-- Bill Void Requests
CREATE TABLE bill_void_request (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_id INTEGER NOT NULL,
    initiated_by INTEGER NOT NULL,
    approved_by INTEGER,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    reason TEXT,
    approval_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    approved_at DATETIME,
    updated_at DATETIME,
    paper_approval_received BOOLEAN DEFAULT FALSE,
    paper_approval_date DATETIME,
    paper_approval_notes TEXT,
    FOREIGN KEY (bill_id) REFERENCES bill(id) ON DELETE CASCADE,
    FOREIGN KEY (initiated_by) REFERENCES user(id),
    FOREIGN KEY (approved_by) REFERENCES user(id)
);

-- Credit Notes
CREATE TABLE credit_note (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_id INTEGER,
    credit_amount DECIMAL(10,2),
    reason TEXT,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'cancelled')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME,
    created_by INTEGER,
    processed_by INTEGER,
    FOREIGN KEY (bill_id) REFERENCES bill(id),
    FOREIGN KEY (created_by) REFERENCES user(id),
    FOREIGN KEY (processed_by) REFERENCES user(id)
);

-- Reopen Reasons
CREATE TABLE reopen_reasons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reason_key VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME
);

-- Notifications
CREATE TABLE notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type VARCHAR(100) NOT NULL CHECK (type IN ('bill_reopened', 'bill_resubmitted', 'void_request', 'void_approved', 'void_rejected')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSON,
    status VARCHAR(20) DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'archived')),
    user_id INTEGER NOT NULL,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES user(id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- User indexes
CREATE INDEX idx_user_username ON user(username);
CREATE INDEX idx_user_status ON user(status);

-- User-Role indexes
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX idx_user_roles_created_at ON user_roles(created_at);
CREATE INDEX idx_user_roles_created_by ON user_roles(created_by);

-- Role-Permission indexes
CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX idx_role_permissions_created_at ON role_permissions(created_at);
CREATE INDEX idx_role_permissions_created_by ON role_permissions(created_by);

-- User Station indexes
CREATE INDEX idx_user_station_user_status ON user_station(user_id, status);
CREATE INDEX idx_user_station_user_default_status ON user_station(user_id, is_default, status);
CREATE INDEX idx_user_station_station_id ON user_station(station_id);

-- Station Pricelist indexes
CREATE UNIQUE INDEX idx_station_pricelist_unique ON station_pricelist(station_id, pricelist_id);
CREATE INDEX idx_station_pricelist_station_default ON station_pricelist(station_id, is_default);
CREATE INDEX idx_station_pricelist_pricelist_status ON station_pricelist(pricelist_id, status);

-- Category indexes
CREATE INDEX idx_category_status ON category(status);

-- Item indexes
CREATE INDEX idx_item_code ON item(code);
CREATE INDEX idx_item_status ON item(status);
CREATE INDEX idx_item_category ON item(item_category_id);

-- Pricelist Item indexes
CREATE INDEX idx_pricelist_item_pricelist ON pricelist_item(pricelist_id);
CREATE INDEX idx_pricelist_item_item ON pricelist_item(item_id);
CREATE INDEX idx_pricelist_item_enabled ON pricelist_item(is_enabled);

-- Bill indexes
CREATE INDEX idx_bill_user_created ON bill(user_id, created_at);
CREATE INDEX idx_bill_status_created ON bill(status, created_at);
CREATE INDEX idx_bill_station_created ON bill(station_id, created_at);
CREATE INDEX idx_bill_request_id ON bill(request_id);

-- Bill Item indexes
CREATE INDEX idx_bill_item_bill_created ON bill_item(bill_id, created_at);
CREATE INDEX idx_bill_item_item_status ON bill_item(item_id, status);

-- Bill Void Request indexes
CREATE INDEX idx_bill_void_request_bill_status ON bill_void_request(bill_id, status);
CREATE INDEX idx_bill_void_request_initiated_created ON bill_void_request(initiated_by, created_at);
CREATE INDEX idx_bill_void_request_approved ON bill_void_request(approved_by, approved_at);

-- Notification indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- =====================================================
-- TRIGGERS FOR AUDIT TRAIL
-- =====================================================

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_user_updated_at 
    AFTER UPDATE ON user
    FOR EACH ROW
    BEGIN
        UPDATE user SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER update_bill_updated_at 
    AFTER UPDATE ON bill
    FOR EACH ROW
    BEGIN
        UPDATE bill SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER update_bill_item_updated_at 
    AFTER UPDATE ON bill_item
    FOR EACH ROW
    BEGIN
        UPDATE bill_item SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER update_user_roles_updated_at 
    AFTER UPDATE ON user_roles
    FOR EACH ROW
    BEGIN
        UPDATE user_roles SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER update_role_permissions_updated_at 
    AFTER UPDATE ON role_permissions
    FOR EACH ROW
    BEGIN
        UPDATE role_permissions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- =====================================================
-- SAMPLE DATA FOR TESTING
-- =====================================================

-- Insert sample permission scopes
INSERT INTO permission_scope (name) VALUES 
('User Management'),
('Station Management'),
('Menu Management'),
('Billing'),
('Reports');

-- Insert sample permissions
INSERT INTO permissions (name, scope_id) VALUES 
('create_user', 1),
('read_user', 1),
('update_user', 1),
('delete_user', 1),
('create_station', 2),
('read_station', 2),
('update_station', 2),
('delete_station', 2),
('create_item', 3),
('read_item', 3),
('update_item', 3),
('delete_item', 3),
('create_bill', 4),
('read_bill', 4),
('update_bill', 4),
('delete_bill', 4),
('void_bill', 4),
('reopen_bill', 4),
('view_reports', 5);

-- Insert sample roles
INSERT INTO roles (name) VALUES 
('admin'),
('supervisor'),
('sales'),
('cashier'),
('storekeeper');

-- Insert sample users (password is 'password123' hashed)
INSERT INTO user (username, lastName, firstName, password, status) VALUES 
('admin', 'Admin', 'System', '$2a$10$rQZ8KjJ8KjJ8KjJ8KjJ8KjJ8KjJ8KjJ8KjJ8KjJ8KjJ8KjJ8KjJ8KjJ', 'ACTIVE'),
('supervisor1', 'Supervisor', 'John', '$2a$10$rQZ8KjJ8KjJ8KjJ8KjJ8KjJ8KjJ8KjJ8KjJ8KjJ8KjJ8KjJ8KjJ8KjJ', 'ACTIVE'),
('sales1', 'Sales', 'Jane', '$2a$10$rQZ8KjJ8KjJ8KjJ8KjJ8KjJ8KjJ8KjJ8KjJ8KjJ8KjJ8KjJ8KjJ8KjJ', 'ACTIVE'),
('cashier1', 'Cashier', 'Bob', '$2a$10$rQZ8KjJ8KjJ8KjJ8KjJ8KjJ8KjJ8KjJ8KjJ8KjJ8KjJ8KjJ8KjJ8KjJ', 'ACTIVE');

-- Insert user-role assignments
INSERT INTO user_roles (user_id, role_id, created_by) VALUES 
(1, 1, 1), -- admin user gets admin role
(2, 2, 1), -- supervisor1 gets supervisor role
(3, 3, 1), -- sales1 gets sales role
(4, 4, 1); -- cashier1 gets cashier role

-- Insert role-permission assignments
INSERT INTO role_permissions (role_id, permission_id, created_by) VALUES 
-- Admin gets all permissions
(1, 1, 1), (1, 2, 1), (1, 3, 1), (1, 4, 1), (1, 5, 1), (1, 6, 1), (1, 7, 1), (1, 8, 1),
(1, 9, 1), (1, 10, 1), (1, 11, 1), (1, 12, 1), (1, 13, 1), (1, 14, 1), (1, 15, 1), (1, 16, 1),
(1, 17, 1), (1, 18, 1), (1, 19, 1),
-- Supervisor gets management permissions
(2, 2, 1), (2, 6, 1), (2, 7, 1), (2, 10, 1), (2, 11, 1), (2, 14, 1), (2, 15, 1), (2, 17, 1), (2, 18, 1), (2, 19, 1),
-- Sales gets sales permissions
(3, 2, 1), (3, 6, 1), (3, 10, 1), (3, 11, 1), (3, 13, 1), (3, 14, 1), (3, 15, 1), (3, 17, 1), (3, 19, 1),
-- Cashier gets cashier permissions
(4, 2, 1), (4, 6, 1), (4, 10, 1), (4, 11, 1), (4, 14, 1), (4, 15, 1), (4, 16, 1), (4, 17, 1), (4, 18, 1), (4, 19, 1);

-- Insert sample stations
INSERT INTO station (name, status, description) VALUES 
('Main Station', 'active', 'Primary sales station'),
('Kitchen Station', 'active', 'Kitchen preparation station'),
('Bar Station', 'active', 'Beverage service station');

-- Insert sample categories
INSERT INTO category (name, status) VALUES 
('Beverages', 'active'),
('Food', 'active'),
('Desserts', 'active'),
('Appetizers', 'active');

-- Insert sample items
INSERT INTO item (name, code, status, item_category_id, is_stock) VALUES 
('Coffee', 'COF001', 'ACTIVE', 1, TRUE),
('Tea', 'TEA001', 'ACTIVE', 1, TRUE),
('Sandwich', 'SAND001', 'ACTIVE', 2, TRUE),
('Cake', 'CAKE001', 'ACTIVE', 3, TRUE);

-- Insert sample pricelists
INSERT INTO pricelist (name, status, is_default, description) VALUES 
('Standard Prices', 'active', TRUE, 'Standard pricing for all items'),
('Happy Hour Prices', 'active', FALSE, 'Discounted prices during happy hour'),
('VIP Prices', 'active', FALSE, 'Premium pricing for VIP customers');

-- Insert sample reopen reasons
INSERT INTO reopen_reasons (reason_key, name, description, sort_order) VALUES 
('payment_discrepancy', 'Payment Discrepancy', 'Bill has payment amount mismatch', 1),
('missing_items', 'Missing Items', 'Some items were not included in the bill', 2),
('incorrect_pricing', 'Incorrect Pricing', 'Items were priced incorrectly', 3),
('customer_complaint', 'Customer Complaint', 'Customer raised a complaint about the bill', 4);

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- View for user with roles
CREATE VIEW user_with_roles AS
SELECT 
    u.id,
    u.username,
    u.firstName,
    u.lastName,
    u.status,
    u.is_locked,
    u.created_at,
    GROUP_CONCAT(r.name) as roles
FROM user u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
GROUP BY u.id, u.username, u.firstName, u.lastName, u.status, u.is_locked, u.created_at;

-- View for bills with details
CREATE VIEW bill_with_details AS
SELECT 
    b.id,
    b.status,
    b.total,
    b.created_at,
    u.username as created_by_username,
    s.name as station_name,
    COUNT(bi.id) as item_count,
    SUM(bi.subtotal) as calculated_total
FROM bill b
LEFT JOIN user u ON b.user_id = u.id
LEFT JOIN station s ON b.station_id = s.id
LEFT JOIN bill_item bi ON b.id = bi.bill_id
GROUP BY b.id, b.status, b.total, b.created_at, u.username, s.name;

-- View for pricelist with items
CREATE VIEW pricelist_with_items AS
SELECT 
    p.id as pricelist_id,
    p.name as pricelist_name,
    p.status as pricelist_status,
    i.id as item_id,
    i.name as item_name,
    i.code as item_code,
    pi.price,
    pi.currency,
    pi.is_enabled
FROM pricelist p
LEFT JOIN pricelist_item pi ON p.id = pi.pricelist_id
LEFT JOIN item i ON pi.item_id = i.id
WHERE pi.is_enabled = TRUE;

-- =====================================================
-- STORED PROCEDURES (SQLite doesn't support stored procedures, but here's the structure)
-- =====================================================

-- Note: SQLite doesn't support stored procedures, but here's what they would look like in MySQL/PostgreSQL:

/*
DELIMITER //
CREATE PROCEDURE CalculateBillTotal(IN bill_id INT)
BEGIN
    UPDATE bill 
    SET total = (
        SELECT COALESCE(SUM(subtotal), 0) 
        FROM bill_item 
        WHERE bill_id = bill_id AND status != 'voided'
    )
    WHERE id = bill_id;
END //
DELIMITER ;

DELIMITER //
CREATE PROCEDURE VoidBillItem(IN item_id INT, IN reason TEXT, IN user_id INT)
BEGIN
    UPDATE bill_item 
    SET status = 'voided',
        void_reason = reason,
        void_approved_by = user_id,
        void_approved_at = NOW()
    WHERE id = item_id;
END //
DELIMITER ;
*/

-- =====================================================
-- END OF SCHEMA
-- =====================================================