# Migration Example: Station Management Page

This example shows how to migrate an existing page to use the new Material Design theme.

## Before (Current Implementation)

```tsx
// Old station management page with gradients and inconsistent styling
<div className="container">
  <div className="row">
    <div className="col-md-6">
      <div className="card gradient-bg">
        <div className="card-header">
          <h3 className="gradient-text">Station Management</h3>
          <button className="btn btn-primary btn-lg shadow-lg">
            Add Station
          </button>
        </div>
        <div className="card-body">
          <table className="table table-striped table-hover">
            <thead className="bg-primary text-white">
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {stations.map(station => (
                <tr key={station.id} className="hover-effect">
                  <td>{station.id}</td>
                  <td>{station.name}</td>
                  <td>
                    <span className="badge bg-success">Active</span>
                  </td>
                  <td>
                    <button className="btn btn-sm btn-outline-primary">
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</div>
```

## After (Material Design Implementation)

```tsx
import { MaterialCard, MaterialButton, MaterialTable, MaterialStatusBadge } from '../components/MaterialComponents';

// New station management page with Material Design
<div className="container-fluid">
  <div className="row">
    <div className="col-12 col-lg-8">
      <MaterialCard 
        title="Station Management"
        subtitle="Manage your POS stations and their configurations"
        headerActions={
          <MaterialButton variant="primary" size="sm">
            <i className="bi bi-plus-circle me-1"></i>
            Add Station
          </MaterialButton>
        }
      >
        <MaterialTable
          headers={['ID', 'Name', 'Status', 'Actions']}
          data={stations.map(station => [
            station.id,
            station.name,
            <MaterialStatusBadge status={station.status}>
              {station.status}
            </MaterialStatusBadge>,
            <div className="d-flex gap-1">
              <MaterialButton variant="outline-primary" size="sm">
                <i className="bi bi-pencil"></i>
              </MaterialButton>
              <MaterialButton variant="outline-danger" size="sm">
                <i className="bi bi-trash"></i>
              </MaterialButton>
            </div>
          ])}
          striped={true}
          hover={true}
        />
      </MaterialCard>
    </div>
    
    <div className="col-12 col-lg-4">
      <MaterialCard title="Quick Stats">
        <div className="d-flex justify-content-between mb-3">
          <span className="text-secondary">Total Stations</span>
          <span className="fw-medium">{stations.length}</span>
        </div>
        <div className="d-flex justify-content-between mb-3">
          <span className="text-secondary">Active</span>
          <MaterialStatusBadge status="success">
            {stations.filter(s => s.status === 'active').length}
          </MaterialStatusBadge>
        </div>
        <div className="d-flex justify-content-between">
          <span className="text-secondary">Inactive</span>
          <MaterialStatusBadge status="error">
            {stations.filter(s => s.status === 'inactive').length}
          </MaterialStatusBadge>
        </div>
      </MaterialCard>
    </div>
  </div>
</div>
```

## Key Changes

### 1. Removed Gradients
- ❌ `gradient-bg` class
- ❌ `gradient-text` class
- ✅ Clean Material Design colors

### 2. Consistent Shadows
- ❌ `shadow-lg` (excessive shadow)
- ✅ `shadow-1`, `shadow-2` (Material Design shadows)

### 3. Component Library
- ❌ Raw Bootstrap components
- ✅ Material Design components

### 4. Better Layout
- ❌ Fixed column widths
- ✅ Responsive grid system
- ✅ Mobile-first approach

### 5. Improved Typography
- ❌ Inconsistent font weights
- ✅ Material Design typography scale
- ✅ Proper text hierarchy

## Benefits of Migration

1. **Cleaner Code**: Less custom CSS, more reusable components
2. **Better UX**: Consistent interactions and visual feedback
3. **Maintainability**: Centralized styling and component library
4. **Accessibility**: Better contrast ratios and focus states
5. **Performance**: Reduced CSS complexity and better rendering
6. **Responsive**: Mobile-first design with proper breakpoints

## Migration Steps

1. **Import Material Components**
   ```tsx
   import { MaterialCard, MaterialButton, MaterialTable } from '../components/MaterialComponents';
   ```

2. **Replace Custom Classes**
   - Replace `gradient-text` with `text-primary`
   - Replace `shadow-lg` with `shadow-2`
   - Replace custom card classes with `MaterialCard`

3. **Update Component Structure**
   - Use `MaterialCard` for containers
   - Use `MaterialButton` for actions
   - Use `MaterialTable` for data display

4. **Test Responsiveness**
   - Check mobile layout
   - Verify tablet layout
   - Test desktop layout

5. **Validate Accessibility**
   - Check color contrast
   - Test keyboard navigation
   - Verify screen reader compatibility

This migration approach ensures a smooth transition to the new Material Design theme while maintaining functionality and improving the overall user experience.
