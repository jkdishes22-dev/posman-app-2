# ACL Implementation Guide

## Overview
This document outlines the implementation of a comprehensive Access Control List (ACL) system for the POS application, making it industry-agnostic and role-based.

## Role Structure

### 1. Admin
- **Purpose**: System administration and configuration
- **Restrictions**: Cannot perform business operations (billing, payments, inventory changes)
- **Permissions**: Full system management, user management, configuration

### 2. Supervisor
- **Purpose**: Operations management and team oversight
- **Capabilities**: Can perform actions of subordinate roles + reporting
- **Permissions**: All sales, cashier, and storekeeper permissions + management features

### 3. Sales (formerly "user")
- **Purpose**: Customer transactions and billing
- **Capabilities**: All customer-facing operations
- **Permissions**: Billing, customer service, menu access

### 4. Cashier
- **Purpose**: Financial operations and payments
- **Capabilities**: Payment processing, cash management
- **Permissions**: Payment processing, financial transactions

### 5. Storekeeper
- **Purpose**: Inventory management and stock control
- **Capabilities**: All inventory-related operations
- **Permissions**: Inventory management, stock control, procurement

## Database Changes

### Migration Applied
- Updated `user` role to `sales`
- Removed `waiter` role
- Added `supervisor` role
- Updated all user-role assignments

### New Role Structure
```sql
-- Current roles after migration
1. admin
2. sales (formerly user)
3. cashier
4. supervisor (new)
5. storekeeper
```

## Permission System

### Permission Categories
- **System**: User management, roles, permissions
- **Billing**: Bills, bill items, bill payments
- **Financial**: Payments, cash management
- **Inventory**: Items, categories, stock management
- **Stations**: Station management, user assignments
- **Pricelists**: Menu and pricing management

### Role Permissions
Each role has specific permissions defined in `src/backend/config/role-permissions.ts`:

```typescript
export const ROLE_PERMISSIONS = {
  admin: [/* system management permissions */],
  supervisor: [/* all subordinate permissions + management */],
  sales: [/* billing and customer operations */],
  cashier: [/* financial operations */],
  storekeeper: [/* inventory management */]
};
```

## Implementation Files

### 1. Role-Specific Dashboards
- `src/app/admin/page.tsx` - System administration
- `src/app/supervisor/page.tsx` - Operations management
- `src/app/sales/page.tsx` - Customer transactions
- `src/app/cashier/page.tsx` - Financial operations
- `src/app/storekeeper/page.tsx` - Inventory management

### 2. ACL Middleware
- `src/backend/middleware/acl.ts` - Permission checking middleware
- `src/backend/config/role-permissions.ts` - Role and permission definitions

### 3. Navigation Components
- `src/app/components/RoleBasedNavigation.tsx` - Role-based menu
- `src/app/components/RoleBasedRoute.tsx` - Route protection

## Usage Examples

### 1. Protecting API Endpoints
```typescript
import { requirePermission, withACL } from '../../backend/middleware/acl';

export default withACL(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  const protectedHandler = requirePermission('can_add_item')(async (req, res) => {
    // Your business logic here
    res.status(201).json({ message: 'Item created successfully' });
  });

  return protectedHandler(req, res);
});
```

### 2. Protecting React Components
```typescript
import { RoleBasedRoute } from '../components/RoleBasedRoute';

function MyComponent({ user }) {
  return (
    <RoleBasedRoute user={user} requiredRole="supervisor">
      <div>Supervisor-only content</div>
    </RoleBasedRoute>
  );
}
```

### 3. Checking Permissions in Components
```typescript
import { usePermission } from '../components/RoleBasedRoute';

function MyComponent({ user }) {
  const canEdit = usePermission('can_edit_item', user);
  
  return (
    <div>
      {canEdit && <button>Edit Item</button>}
    </div>
  );
}
```

## Menu Structure

### Admin Menu
- Dashboard
- User Management
- Stations
- Menu Management
- System Settings

### Supervisor Menu
- Dashboard
- Sales Management
- Team Management
- Reports
- Inventory Overview

### Sales Menu
- Dashboard
- Billing
- Menu
- Customer Service
- Reports

### Cashier Menu
- Dashboard
- Payment Processing
- Cash Management
- Financial Reports

### Storekeeper Menu
- Dashboard
- Inventory
- Stock Management
- Suppliers
- Reports

## Security Features

### 1. Role Hierarchy
- Supervisors inherit permissions from subordinate roles
- Admin has system management only (no business operations)

### 2. Permission Inheritance
- Roles automatically inherit permissions from lower roles
- Prevents permission duplication and ensures consistency

### 3. Business Operation Restrictions
- Admin role cannot perform business operations
- Ensures separation of system and business concerns

### 4. Route Protection
- All routes protected by role and permission checks
- Automatic redirects for unauthorized access

## Testing the Implementation

### 1. Database Verification
```sql
-- Check updated roles
SELECT * FROM roles ORDER BY id;

-- Check user role assignments
SELECT ur.*, r.NAME as role_name 
FROM user_roles ur 
JOIN roles r ON ur.role_id = r.id;
```

### 2. Permission Testing
- Test each role's access to different features
- Verify admin restrictions on business operations
- Confirm supervisor access to subordinate features

### 3. Navigation Testing
- Verify role-specific menus appear correctly
- Test route protection and redirects
- Confirm permission-based UI hiding/showing

## Migration Notes

### What Changed
1. **Role Names**: `user` → `sales`, removed `waiter`
2. **New Role**: Added `supervisor` role
3. **User Assignments**: All `waiter` users moved to `sales`
4. **Permission System**: Enhanced with role hierarchy
5. **UI Components**: Role-specific dashboards and navigation

### Backward Compatibility
- All existing functionality preserved
- User experience enhanced with role-specific interfaces
- No breaking changes to existing APIs

## Future Enhancements

### 1. Dynamic Permissions
- Allow runtime permission changes
- User-specific permission overrides
- Temporary permission grants

### 2. Audit Logging
- Track permission usage
- Monitor role changes
- Security event logging

### 3. Advanced Features
- Multi-tenant support
- Department-based permissions
- Time-based access controls

## Conclusion

The ACL system provides a robust, scalable foundation for role-based access control that makes the application industry-agnostic and professionally structured. The implementation ensures security, maintainability, and user experience while providing clear separation of concerns between different user types.
