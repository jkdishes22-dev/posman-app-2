# Material Design Implementation Guide

This guide outlines the Material Design theme implementation for the POS Management application, based on [MDBootstrap](https://mdbootstrap.com/) principles and [Bootswatch Materia](https://bootswatch.com/materia/) inspiration.

## 🎨 Design Principles

### Color Palette
```css
:root {
    --md-primary: #1976d2;        /* Primary Blue */
    --md-primary-dark: #1565c0;   /* Darker Blue */
    --md-primary-light: #42a5f5;  /* Lighter Blue */
    --md-secondary: #424242;      /* Dark Gray */
    --md-accent: #ff4081;         /* Pink Accent */
    --md-success: #4caf50;        /* Green */
    --md-warning: #ff9800;        /* Orange */
    --md-danger: #f44336;         /* Red */
    --md-info: #2196f3;           /* Light Blue */
    --md-light: #f5f5f5;          /* Light Gray */
    --md-dark: #212121;           /* Dark */
    --md-surface: #ffffff;        /* White Surface */
    --md-background: #fafafa;     /* Background */
    --md-text-primary: #212121;   /* Primary Text */
    --md-text-secondary: #757575; /* Secondary Text */
    --md-divider: #e0e0e0;        /* Divider */
}
```

### Shadow System
- **shadow-1**: `0 2px 4px rgba(0, 0, 0, 0.1)` - Subtle elevation
- **shadow-2**: `0 4px 8px rgba(0, 0, 0, 0.12)` - Card elevation
- **shadow-3**: `0 8px 16px rgba(0, 0, 0, 0.14)` - Modal elevation
- **shadow-4**: `0 16px 24px rgba(0, 0, 0, 0.16)` - High elevation

## 🧩 Component Library

### MaterialButton
```tsx
import { MaterialButton } from '../components/MaterialComponents';

<MaterialButton variant="primary" size="sm">
  Add Item
</MaterialButton>
```

### MaterialCard
```tsx
import { MaterialCard } from '../components/MaterialComponents';

<MaterialCard 
  title="Station Management" 
  subtitle="Manage your POS stations"
  headerActions={<MaterialButton variant="primary">Add Station</MaterialButton>}
>
  {/* Card content */}
</MaterialCard>
```

### MaterialAlert
```tsx
import { MaterialAlert } from '../components/MaterialComponents';

<MaterialAlert variant="danger" title="Error">
  Something went wrong
</MaterialAlert>
```

### MaterialTable
```tsx
import { MaterialTable } from '../components/MaterialComponents';

<MaterialTable
  headers={['ID', 'Name', 'Status', 'Actions']}
  data={[
    [1, 'Station 1', 'Active', 'Edit'],
    [2, 'Station 2', 'Inactive', 'Edit']
  ]}
/>
```

## 🎯 Implementation Guidelines

### 1. Remove Gradients
**Before:**
```css
.gradient-text {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    -webkit-background-clip: text;
}
```

**After:**
```css
.text-primary {
    color: var(--md-primary);
    font-weight: 500;
}
```

### 2. Consistent Shadows
**Before:**
```css
.card:hover {
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15) !important;
}
```

**After:**
```css
.card {
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.card:hover {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.12);
}
```

### 3. Material Design Buttons
**Before:**
```tsx
<Button variant="primary" className="btn-lg">
  Submit
</Button>
```

**After:**
```tsx
<MaterialButton variant="primary" size="lg">
  Submit
</MaterialButton>
```

### 4. Clean Tables
**Before:**
```tsx
<Table striped hover bordered>
  <thead>
    <tr>
      <th>Name</th>
    </tr>
  </thead>
</Table>
```

**After:**
```tsx
<MaterialTable
  headers={['Name', 'Status', 'Actions']}
  data={tableData}
  striped={true}
  hover={true}
/>
```

## 📱 Responsive Design

### Breakpoints
- **xs**: < 576px (Mobile)
- **sm**: ≥ 576px (Tablet Portrait)
- **md**: ≥ 768px (Tablet Landscape)
- **lg**: ≥ 992px (Desktop)
- **xl**: ≥ 1200px (Large Desktop)

### Mobile-First Approach
```tsx
<div className="row">
  <div className="col-12 col-md-6 col-lg-4">
    <MaterialCard title="Mobile Card">
      Content
    </MaterialCard>
  </div>
</div>
```

## 🎨 Typography

### Headings
- **H1**: 2.5rem, font-weight: 300
- **H2**: 2rem, font-weight: 400
- **H3**: 1.75rem, font-weight: 400
- **H4**: 1.5rem, font-weight: 500
- **H5**: 1.25rem, font-weight: 500
- **H6**: 1rem, font-weight: 500

### Body Text
- **Primary**: 1rem, color: var(--md-text-primary)
- **Secondary**: 0.875rem, color: var(--md-text-secondary)

## 🔧 Migration Checklist

### Phase 1: Global Styles ✅
- [x] Implement Material Design color palette
- [x] Add shadow system
- [x] Update button styles
- [x] Update card styles
- [x] Update table styles
- [x] Update alert styles

### Phase 2: Component Library ✅
- [x] Create MaterialButton component
- [x] Create MaterialCard component
- [x] Create MaterialAlert component
- [x] Create MaterialTable component
- [x] Create MaterialBadge component
- [x] Create MaterialSectionHeader component

### Phase 3: Page Updates (In Progress)
- [ ] Update Station Management page
- [ ] Update Pricelist Management page
- [ ] Update Category Management page
- [ ] Update User Management page
- [ ] Update Production pages

### Phase 4: Navigation & Layout
- [ ] Update AdminLayout
- [ ] Update Navbar
- [ ] Update Sidebar
- [ ] Update Footer

## 🚀 Quick Start

### 1. Import Material Components
```tsx
import { MaterialButton, MaterialCard, MaterialAlert } from '../components/MaterialComponents';
```

### 2. Use Material Design Classes
```tsx
<div className="shadow-2 rounded p-3">
  <h4 className="fw-medium text-primary">Title</h4>
  <p className="text-secondary">Description</p>
</div>
```

### 3. Apply Consistent Spacing
```tsx
<div className="mb-4">  {/* Material Design spacing */}
  <MaterialButton variant="primary">Action</MaterialButton>
</div>
```

## 📊 Benefits

1. **Consistency**: Uniform look and feel across all pages
2. **Maintainability**: Centralized styling with CSS variables
3. **Accessibility**: Better contrast ratios and focus states
4. **Performance**: Reduced CSS complexity and better rendering
5. **User Experience**: Clean, professional interface
6. **Developer Experience**: Reusable components and clear guidelines

## 🔗 Resources

- [Material Design Guidelines](https://material.io/design)
- [MDBootstrap Documentation](https://mdbootstrap.com/)
- [Bootswatch Materia Theme](https://bootswatch.com/materia/)
- [Bootstrap 5 Documentation](https://getbootstrap.com/docs/5.3/)

This implementation provides a clean, professional, and maintainable UI that follows Material Design principles while leveraging Bootstrap's robust component system.
