/**
 * @fileoverview Email Dashboard Layout Module Exports
 * 
 * This module provides the main exports for the email dashboard layout system,
 * including all components, types, and configurations needed to implement
 * a complete email management dashboard interface.
 * 
 * @module components/email-message/dashboard-layout
 * @version 1.0.0
 * @since 2025-07-19
 */

// Main layout component
export { EmailDashboardLayout } from './email-dashboard-layout';

// Sub-components
export { CustomEmailPageItem } from './custom-email-page-item';
export { EmailDashboardToolbarAction } from './email-dashboard-toolbar-action';

// Configuration and branding
export { Branding } from './branding';

// Type definitions
export type {
  CustomEmailPageItemProps,
  EmailDashboardLayoutProps,
  BrandingConfig,
  DashboardSlots,
  RenderPageItemFunction,
  RenderPageItemOptions,
} from './types';
