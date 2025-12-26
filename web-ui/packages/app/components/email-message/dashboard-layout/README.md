# Email Dashboard Layout Documentation

## Overview

The Email Dashboard Layout system provides a comprehensive dashboard interface for email management within the application. This documentation covers all the types, components, and configurations used in the email dashboard layout folder.

## Architecture

The dashboard layout system is organized into several key components:

- **EmailDashboardLayout**: Main layout component that orchestrates the entire dashboard
- **CustomEmailPageItem**: Specialized navigation component for email-specific pages
- **EmailDashboardToolbarAction**: Toolbar actions component for theme and account controls
- **Branding**: Configuration component for application branding
- **Types**: Comprehensive type definitions for all dashboard components

## Components

### EmailDashboardLayout

**File**: `email-dashboard-layout.tsx`

The main dashboard layout component that provides the overall structure for email-related pages.

**Props**: `EmailDashboardLayoutProps`
- `children: React.ReactNode` - Content to render within the layout
- `session: Session | null` - Current user session information

**Features**:
- Dynamic navigation based on email context
- Responsive sidebar with mini mode support
- Theme integration with light/dark mode support
- Session-based authentication handling
- Integrated toolbar actions

**Usage**:
```tsx
<EmailDashboardLayout session={session}>
  <EmailPageContent />
</EmailDashboardLayout>
```

### CustomEmailPageItem

**File**: `custom-email-page-item.tsx`

Specialized navigation component for rendering email-specific page items with hierarchical children.

**Props**: `CustomEmailPageItemProps`
- `item: NavigationPageItem` - Navigation item with title, icon, and children
- `mini: boolean` - Whether sidebar is in collapsed mode
- `emailId: string` - Unique identifier for the email being viewed

**Features**:
- Hierarchical navigation display
- Icon-only mode for mini sidebar
- Dynamic link generation based on email ID
- Material-UI styled components
- Responsive design

**Usage**:
```tsx
<CustomEmailPageItem
  item={{
    title: 'View Email',
    icon: <DraftsIcon />,
    children: [
      { title: 'Key Points', segment: 'key-points' },
      { title: 'Notes', segment: 'notes' }
    ]
  }}
  mini={false}
  emailId="email-123"
/>
```

### EmailDashboardToolbarAction

**File**: `email-dashboard-toolbar-action.tsx`

Toolbar component that renders action controls in the dashboard header.

**Features**:
- Theme selector for light/dark mode switching
- Account menu for user management
- Horizontal stack layout
- Integration with Toolpad Core Account component

**Usage**:
```tsx
const dashboardSlots = {
  toolbarActions: EmailDashboardToolbarAction,
};

<DashboardLayout slots={dashboardSlots}>
  {children}
</DashboardLayout>
```

### Branding

**File**: `branding.tsx`

Branding configuration component that defines application identity in the dashboard header.

**Config**: `BrandingConfig`
- `title: string` - Application title displayed in header
- `logo: React.ReactElement` - Logo component (uses Next.js Image)

**Features**:
- Optimized image loading with Next.js Image component
- 40x40 pixel badge logo
- Consistent branding across dashboard pages

**Usage**:
```tsx
<NextAppProvider branding={Branding}>
  <DashboardLayout>
    {children}
  </DashboardLayout>
</NextAppProvider>
```

## Type Definitions

### Core Interfaces

#### CustomEmailPageItemProps
Defines properties for email-specific navigation items.

```typescript
interface CustomEmailPageItemProps {
  item: NavigationPageItem;    // Navigation item data
  mini: boolean;               // Sidebar mini mode flag
  emailId: string;            // Email unique identifier
}
```

#### EmailDashboardLayoutProps
Defines properties for the main dashboard layout.

```typescript
interface EmailDashboardLayoutProps {
  children: React.ReactNode;   // Main content area
  session: Session | null;     // Authentication session
}
```

#### BrandingConfig
Defines branding configuration structure.

```typescript
interface BrandingConfig {
  title: string;               // Application title
  logo: React.ReactElement;    // Logo component
}
```

### Extended Interfaces

#### DashboardSlots
Defines customizable slots in the dashboard layout.

```typescript
interface DashboardSlots {
  toolbarActions: React.ComponentType;  // Toolbar actions component
}
```

#### RenderPageItemFunction
Function signature for custom page item rendering.

```typescript
type RenderPageItemFunction = (
  item: NavigationPageItem,
  options: RenderPageItemOptions
) => React.JSX.Element | null;
```

#### RenderPageItemOptions
Options passed to page item renderer functions.

```typescript
interface RenderPageItemOptions {
  mini: boolean;               // Sidebar mini mode state
}
```

## File Structure

```
components/email-message/dashboard-layout/
├── index.ts                     # Main exports
├── types.ts                     # Type definitions
├── email-dashboard-layout.tsx   # Main layout component
├── custom-email-page-item.tsx   # Email navigation component
├── email-dashboard-toolbar-action.tsx  # Toolbar actions
└── branding.tsx                 # Branding configuration
```

## Dependencies

### External Libraries
- **@toolpad/core**: Dashboard layout primitives and navigation
- **@mui/material**: Material-UI components for styling
- **next/image**: Optimized image loading
- **next-auth**: Authentication session management
- **next/navigation**: Next.js navigation utilities

### Internal Dependencies
- **@/components/theme/theme-selector**: Theme switching component
- **@/components/email-message/email-context**: Email context provider
- **@/lib/themes**: Theme configuration and utilities
- **@/lib/site-util/url-builder**: URL construction utilities

## Styling and Theming

The dashboard layout uses Material-UI's `sx` prop for dynamic styling with theme integration:

- **Primary Colors**: Used for main navigation elements and icons
- **Secondary Colors**: Used for links and secondary elements
- **Responsive Spacing**: Uses theme spacing units for consistency
- **Theme-aware**: Automatically adapts to light/dark mode themes

## Navigation Structure

The dashboard supports hierarchical navigation:

1. **Header**: "Available Records" and "Acquisition" sections
2. **Main Pages**: List Emails, Import Emails
3. **Email-specific**: View Email with nested sections
   - Key Points
   - Notes  
   - Calls to Action
   - Follow-up Activity
   - Headers

## Best Practices

### Component Organization
- Each component in its own file for maintainability
- Comprehensive type definitions in dedicated types file
- Clear separation of concerns between layout, navigation, and actions

### TypeScript Usage
- Strict typing for all props and interfaces
- Proper use of generics for extensibility
- Clear documentation with JSDoc comments

### Performance Considerations
- React.memo for preventing unnecessary re-renders
- Stable object references for dashboard slots
- Optimized image loading with Next.js Image component

### Accessibility
- Proper ARIA labels for interactive elements
- Semantic HTML structure with Material-UI components
- Keyboard navigation support through Toolpad Core

## Migration Guide

If migrating from the previous monolithic component:

1. **Update Imports**: Import components from individual files
2. **Type Safety**: Use the new typed interfaces
3. **Props**: Ensure props match the new interface definitions
4. **Styling**: Leverage the new theme integration features

## Future Enhancements

Potential areas for expansion:

- **Additional Toolbar Actions**: Support for more toolbar customization
- **Sidebar Plugins**: Extensible sidebar sections
- **Navigation Presets**: Predefined navigation configurations
- **Advanced Theming**: More granular theme customization options

## Troubleshooting

### Common Issues

1. **Import Errors**: Ensure all files are properly exported in index.ts
2. **Type Mismatches**: Verify props match the interface definitions
3. **Styling Issues**: Check theme integration and Material-UI version compatibility
4. **Navigation Problems**: Verify URL builder configuration and routing setup

### Debug Tips

- Use React DevTools to inspect component hierarchy
- Check browser console for TypeScript compilation errors  
- Verify theme context is properly provided
- Test both mini and full sidebar modes
