/**
 * @fileoverview Email Dashboard Toolbar Action Component
 * 
 * This module provides the EmailDashboardToolbarAction component used in the email
 * dashboard layout toolbar. It renders action elements like theme selector and
 * account controls in the dashboard header.
 * 
 * @module components/email-message/dashboard-layout/email-dashboard-toolbar-action
 * @version 1.0.0
 * @since 2025-07-19
 */

import * as React from 'react';
import { Stack } from '@mui/material';
import { ThemeSelector } from '@/components/theme/theme-selector';
import { Account } from '@toolpad/core/Account';
import { MemoryStatusIndicator } from '@/components/memory-status';

/**
 * EmailDashboardToolbarAction renders the toolbar actions for the email dashboard.
 * 
 * @description This component provides the action elements displayed in the dashboard
 * toolbar, including the theme selector for switching between light/dark themes,
 * the memory status indicator for monitoring memory service health, and the 
 * account component for user account management and authentication controls.
 * The elements are arranged horizontally using a Stack layout.
 * 
 * @component
 * @returns A React element containing the toolbar actions
 * 
 * @example
 * ```tsx
 * // Used as a slot in DashboardLayout
 * const dashboardSlots = {
 *   toolbarActions: EmailDashboardToolbarAction,
 * };
 * 
 * <DashboardLayout slots={dashboardSlots}>
 *   {children}
 * </DashboardLayout>
 * ```
 * 
 * @see {@link ThemeSelector} - Component for theme switching functionality
 * @see {@link MemoryStatusIndicator} - Component for memory service health monitoring
 * @see {@link Account} - Component for user account management
 */
export const EmailDashboardToolbarAction = React.memo((): React.JSX.Element => {
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <MemoryStatusIndicator size="small" />
      <ThemeSelector />
      <Account />
    </Stack>
  );
});

EmailDashboardToolbarAction.displayName = 'EmailDashboardToolbarAction';
