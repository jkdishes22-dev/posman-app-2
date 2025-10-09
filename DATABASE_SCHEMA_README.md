# POS Management System Database Schema

This document describes the complete database schema for the POS Management System, generated from TypeORM entities.

## Overview

The database schema is designed to support a comprehensive Point of Sale (POS) management system with the following key features:

- **User Management**: Multi-role user system with permissions
- **Station Management**: Multiple sales stations with pricelist assignments
- **Menu Management**: Categories, items, and pricing
- **Billing System**: Bills, payments, and financial tracking
- **Bill Management**: Voiding, reopening, and approval workflows
- **Notifications**: System notifications for various events

## Database Structure

### Core System Tables

#### User Management
- `user` - User accounts with authentication
- `roles` - User roles (admin, supervisor, sales, cashier, storekeeper)
- `permissions` - System permissions
- `permission_scope` - Permission categories
- `user_roles` - Many-to-many relationship between users and roles
- `role_permissions` - Many-to-many relationship between roles and permissions

#### Station and Pricelist Management
- `station` - Sales stations/locations
- `user_station` - User assignments to stations
- `pricelist` - Pricing lists for different contexts
- `station_pricelist` - Station-pricelist associations

### Menu and Inventory Management

#### Categories and Items
- `category` - Item categories (beverages, food, etc.)
- `item` - Individual menu items
- `item_group` - Item groupings and portions
- `pricelist_item` - Item pricing within pricelists
- `inventory_item` - Inventory tracking for items

### Billing System

#### Core Billing
- `bill` - Sales bills/orders
- `bill_item` - Items within bills
- `payment` - Payment transactions
- `bill_payment` - Bill-payment associations

#### Bill Management Features
- `bill_void_request` - Bill voiding workflow
- `credit_note` - Credit note management
- `reopen_reasons` - Predefined reasons for bill reopening
- `notifications` - System notifications

## Key Features

### 1. Multi-Role User System
- **Admin**: Full system access
- **Supervisor**: Management and oversight capabilities
- **Sales**: Order creation and management
- **Cashier**: Payment processing and bill management
- **Storekeeper**: Inventory management

### 2. Station-Based Operations
- Users can be assigned to multiple stations
- Each station can have multiple pricelists
- Station-specific pricing and availability

### 3. Bill Management Workflows

#### Voiding Workflow
- Sales users can request item voiding
- Cashiers/supervisors approve void requests
- Paper approval tracking for compliance
- Status tracking: `pending` → `approved`/`rejected`

#### Reopening Workflow
- Cashiers can reopen bills for corrections
- Sales users fix issues and resubmit
- Reason tracking and approval workflow
- Status transitions: `submitted` → `reopened` → `submitted`

### 4. Payment Processing
- Multiple payment types (CASH, MPESA)
- Credit and debit amount tracking
- Payment reference management
- Bill-payment associations

### 5. Notification System
- Real-time notifications for bill events
- User-specific notification targeting
- Status tracking (unread, read, archived)
- JSON data support for complex notifications

## Database Constraints

### Foreign Key Constraints
All relationships are properly enforced with foreign key constraints:
- User-role relationships
- Station-user assignments
- Bill-item relationships
- Payment-bill associations
- Notification targeting

### Check Constraints
- Status fields use ENUM values
- Payment types are restricted
- Boolean fields are properly constrained
- Currency codes are validated

### Unique Constraints
- Username uniqueness
- Request ID uniqueness
- Station-pricelist uniqueness
- Reason key uniqueness

## Indexes for Performance

### Primary Indexes
- All primary keys are automatically indexed
- Foreign key columns are indexed for join performance

### Composite Indexes
- User-station status queries
- Bill status and creation date
- Notification user and status
- Void request tracking

### Query Optimization Indexes
- Username lookups
- Item code searches
- Category status filtering
- Pricelist item availability

## Sample Data

The schema includes sample data for testing:
- Default permission scopes and permissions
- Standard user roles
- Sample users with hashed passwords
- Test stations and categories
- Sample items and pricelists
- Common reopen reasons

## Views for Common Queries

### User with Roles View
```sql
SELECT u.*, GROUP_CONCAT(r.name) as roles
FROM user u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
GROUP BY u.id;
```

### Bill with Details View
```sql
SELECT b.*, u.username, s.name as station_name, 
       COUNT(bi.id) as item_count, SUM(bi.subtotal) as calculated_total
FROM bill b
LEFT JOIN user u ON b.user_id = u.id
LEFT JOIN station s ON b.station_id = s.id
LEFT JOIN bill_item bi ON b.id = bi.bill_id
GROUP BY b.id;
```

### Pricelist with Items View
```sql
SELECT p.*, i.name as item_name, i.code, pi.price, pi.currency
FROM pricelist p
LEFT JOIN pricelist_item pi ON p.id = pi.pricelist_id
LEFT JOIN item i ON pi.item_id = i.id
WHERE pi.is_enabled = TRUE;
```

## Audit Trail

### Automatic Timestamps
- `created_at` - Set on record creation
- `updated_at` - Updated on record modification
- `created_by` - User who created the record
- `updated_by` - User who last modified the record

### Triggers
- Automatic `updated_at` timestamp updates
- Audit trail maintenance
- Data consistency enforcement

## Business Rules Implementation

### Bill Status Management
- Bills can only be reopened in `submitted` state
- Void requests require approval workflow
- Status transitions are validated
- Payment discrepancies trigger reopening

### User Permissions
- Role-based access control
- Permission scoping for fine-grained control
- Station-based access restrictions
- Pricelist access validation

### Data Integrity
- Referential integrity with foreign keys
- Check constraints for data validation
- Unique constraints for business rules
- Cascade deletes for related data cleanup

## Migration Considerations

### TypeORM Compatibility
- All entities map directly to database tables
- Column types match TypeORM specifications
- Relationship mappings are preserved
- Index definitions are included

### Performance Optimization
- Strategic indexing for common queries
- Composite indexes for multi-column searches
- Foreign key indexes for join performance
- Query optimization views

### Scalability
- Normalized design reduces data redundancy
- Proper indexing supports large datasets
- Partitioning-ready structure
- Efficient relationship management

## Security Considerations

### Data Protection
- Password hashing (bcrypt)
- Refresh token storage
- User lockout capabilities
- Audit trail for all changes

### Access Control
- Role-based permissions
- Station-based restrictions
- User activity tracking
- Secure data relationships

## Maintenance

### Regular Tasks
- Index maintenance
- Data cleanup
- Performance monitoring
- Backup procedures

### Monitoring
- Query performance analysis
- Index usage statistics
- Data growth tracking
- Constraint violation monitoring

This schema provides a robust foundation for a comprehensive POS management system with proper data integrity, performance optimization, and business rule enforcement.