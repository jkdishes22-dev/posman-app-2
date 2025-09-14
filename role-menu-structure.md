# ACL-Driven Menu Structure

## 1. ADMIN Role
**Purpose:** System administration, user management, configuration
**Restrictions:** No business operations (billing, payments, inventory changes)

### Menu Structure:
```
Dashboard
├── System Overview
├── User Activity Logs
└── System Health

User Management
├── Users
├── Roles & Permissions
└── User Activity

System Configuration
├── Stations
├── Pricelists
├── Categories
├── Items
└── System Settings

Reports (Read-Only)
├── System Reports
├── User Activity Reports
└── Audit Logs
```

## 2. SUPERVISOR Role
**Purpose:** Operations management, team oversight, data analysis
**Capabilities:** Can perform actions of roles they manage + reporting

### Menu Structure:
```
Dashboard
├── Operations Overview
├── Today's Summary
├── Team Performance
└── Quick Actions

Sales Management
├── Active Bills
├── Sales Reports
├── Customer Management
└── Sales Analytics

Financial Operations
├── Cash Management
├── Payment Reports
├── Financial Summary
└── Cashier Oversight

Inventory Management
├── Stock Overview
├── Inventory Reports
├── Stock Alerts
└── Storekeeper Oversight

Team Management
├── Staff Schedule
├── Performance Tracking
├── Role Assignments
└── Training Records

Reports & Analytics
├── Sales Reports
├── Financial Reports
├── Inventory Reports
├── Staff Performance
└── Custom Reports
```

## 3. SALES Role (formerly "user")
**Purpose:** Customer transactions, billing, order management
**Capabilities:** All customer-facing operations

### Menu Structure:
```
Dashboard
├── Active Orders
├── Today's Sales
├── Quick Actions
└── Recent Activity

Billing
├── New Bill
├── Active Bills
├── Bill History
└── Customer Search

Menu Management
├── Item Catalog
├── Category View
├── Price Lists
└── Item Search

Customer Service
├── Customer Lookup
├── Order History
├── Loyalty Programs
└── Customer Support

Reports
├── Personal Sales
├── Daily Summary
└── Performance Metrics
```

## 4. CASHIER Role
**Purpose:** Financial operations, payments, cash management
**Capabilities:** Payment processing, financial transactions

### Menu Structure:
```
Dashboard
├── Cash Drawer
├── Today's Transactions
├── Pending Payments
└── Quick Actions

Payment Processing
├── Process Payment
├── Refund Management
├── Payment Methods
└── Transaction History

Cash Management
├── Cash Drawer Status
├── Cash Count
├── Cash Reports
└── Reconciliation

Financial Reports
├── Daily Summary
├── Payment Reports
├── Cash Flow
└── Transaction Logs

Support
├── Bill Lookup
├── Customer Payments
└── Payment Issues
```

## 5. STOREKEEPER Role
**Purpose:** Inventory management, stock control, procurement
**Capabilities:** All inventory-related operations

### Menu Structure:
```
Dashboard
├── Stock Overview
├── Low Stock Alerts
├── Recent Activity
└── Quick Actions

Inventory Management
├── Stock Levels
├── Item Management
├── Stock Adjustments
└── Inventory Count

Procurement
├── Purchase Orders
├── Supplier Management
├── Receiving
└── Order History

Stock Control
├── Stock Movements
├── Transfers
├── Damaged Items
└── Stock Reports

Reports
├── Inventory Reports
├── Stock Analysis
├── Movement Reports
└── Cost Analysis
```

## Permission Matrix

| Feature | Admin | Supervisor | Sales | Cashier | Storekeeper |
|---------|-------|------------|-------|---------|-------------|
| User Management | ✅ | ✅ (Team) | ❌ | ❌ | ❌ |
| System Config | ✅ | ❌ | ❌ | ❌ | ❌ |
| Billing | ❌ | ✅ | ✅ | ❌ | ❌ |
| Payments | ❌ | ✅ | ❌ | ✅ | ❌ |
| Inventory | ❌ | ✅ (View) | ❌ | ❌ | ✅ |
| Reports | ✅ (System) | ✅ (All) | ✅ (Sales) | ✅ (Financial) | ✅ (Inventory) |
| Station Management | ✅ | ✅ | ❌ | ❌ | ❌ |
| Pricelist Management | ✅ | ✅ | ❌ | ❌ | ❌ |

## Implementation Plan

1. **Create new branch:** `fix-acl`
2. **Database changes:**
   - Update role names in database
   - Migrate existing "user" role to "sales"
   - Remove "waiter" role
   - Update user-role assignments
3. **Frontend changes:**
   - Create role-specific menu components
   - Update navigation based on user role
   - Implement permission-based UI hiding/showing
4. **Backend changes:**
   - Update permission system
   - Add role-based access control middleware
   - Update API endpoints with role checks

Would you like me to proceed with creating the `fix-acl` branch and start implementing this structure?
