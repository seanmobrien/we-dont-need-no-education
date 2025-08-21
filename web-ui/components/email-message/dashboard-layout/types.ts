/**
 * @fileoverview Type definitions for Email Dashboard Layout components
 * 
 * This module provides TypeScript interfaces and type definitions used across
 * the email dashboard layout system, ensuring type safety and consistency
 * in component props and data structures.
 * 
 * @module components/email-message/dashboard-layout/types
 * @version 1.0.0
 * @since 2025-07-19
 */

import { NavigationPageItem } from '@toolpad/core/AppProvider';
import { Session } from 'next-auth';
import * as React from 'react';

/**
 * Props for the CustomEmailPageItem component.
 * 
 * @interface CustomEmailPageItemProps
 * @description Defines the properties required for rendering a custom email page item
 * in the dashboard navigation sidebar.
 */
export interface CustomEmailPageItemProps {
  /** The navigation page item containing title, icon, and children */
  item: NavigationPageItem;
  /** Whether the sidebar is in minimized (mini) mode */
  mini: boolean;
  /** The unique identifier of the email being viewed */
  emailId: string;
  /** The active pathname  */
  pathname: string;
}

/**
 * Props for the EmailDashboardLayout component.
 * 
 * @interface EmailDashboardLayoutProps
 * @description Defines the properties required for the main email dashboard layout component.
 */
export interface EmailDashboardLayoutProps {
  /** The child components to render inside the layout */
  children: React.ReactNode;
  /** The current user session information, null if not authenticated */
  session: Session | null;
}

/**
 * Configuration object for dashboard branding.
 * 
 * @interface BrandingConfig
 * @description Defines the structure for branding elements in the dashboard header.
 */
export interface BrandingConfig {
  /** The application title displayed in the dashboard header */
  title: string;
  /** The logo component/element to display in the dashboard header */
  logo: React.ReactElement;
}

/**
 * Slots configuration for the dashboard layout.
 * 
 * @interface DashboardSlots
 * @description Defines the available slots that can be customized in the dashboard layout.
 */
export interface DashboardSlots {
  /** Component to render in the toolbar actions area */
  toolbarActions: React.ComponentType;
}

/**
 * Options for rendering navigation page items.
 * 
 * @interface RenderPageItemOptions
 * @description Configuration options passed to the page item renderer function.
 */
export interface RenderPageItemOptions {
  /** Whether the sidebar is in minimized mode */
  mini: boolean;
}

/**
 * Type definition for the render page item function.
 * 
 * @typedef RenderPageItemFunction
 * @description Function signature for custom page item rendering in the dashboard sidebar.
 * 
 * @param item - The navigation page item to render
 * @param options - Rendering options and configuration
 * @returns The rendered React element or null if the item should not be rendered
 */
export type RenderPageItemFunction = (
  item: NavigationPageItem,
  options: RenderPageItemOptions
) => React.JSX.Element | null;
