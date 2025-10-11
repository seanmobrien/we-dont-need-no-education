/**
 * @fileoverview Database Status Indicator Component
 *
 * This component provides a visual indicator for database service health status.
 *
 * @module components/database-status/database-status-indicator
 * @version 1.0.0
 */

'use client';

import * as React from 'react';
import { Chip, Tooltip, CircularProgress, Box } from '@mui/material';
import {
  CheckCircle as HealthyIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Storage as DatabaseIcon,
} from '@mui/icons-material';
import { useDatabaseHealth } from '/lib/hooks/use-database-health';

/**
 * Props for the DatabaseStatusIndicator component
 */
interface DatabaseStatusIndicatorProps {
  /**
   * Whether to show detailed status text alongside the icon
   */
  showLabel?: boolean;

  /**
   * Size variant for the indicator
   */
  size?: 'small' | 'medium';
}

type DatabaseHealthStatus = 'ok' | 'warning' | 'error';

/**
 * Gets the appropriate icon for the health status
 */
function getStatusIcon(status: DatabaseHealthStatus, isLoading: boolean) {
  if (isLoading) {
    return <CircularProgress size={16} />;
  }

  switch (status) {
    case 'ok':
      return <HealthyIcon fontSize="small" />;
    case 'warning':
      return <WarningIcon fontSize="small" />;
    case 'error':
      return <ErrorIcon fontSize="small" />;
    default:
      return <DatabaseIcon fontSize="small" />;
  }
}

/**
 * Gets the appropriate color for the health status
 */
function getStatusColor(
  status: DatabaseHealthStatus,
): 'success' | 'warning' | 'error' | 'default' {
  switch (status) {
    case 'ok':
      return 'success';
    case 'warning':
      return 'warning';
    case 'error':
      return 'error';
    default:
      return 'default';
  }
}

/**
 * Gets the human-readable label for the health status
 */
function getStatusLabel(status: DatabaseHealthStatus): string {
  switch (status) {
    case 'ok':
      return 'Database: Healthy';
    case 'warning':
      return 'Database: Warning';
    case 'error':
      return 'Database: Error';
    default:
      return 'Database: Unknown';
  }
}

/**
 * Gets the detailed tooltip message based on health status
 */
function getTooltipMessage(
  status: DatabaseHealthStatus,
  isLoading: boolean,
  isError: boolean,
  error: Error | null,
  refreshInterval: number,
): string {
  if (isLoading) {
    return 'Checking database service health...';
  }

  if (isError && error) {
    return `Database health check failed: ${error.message}`;
  }

  const refreshSeconds = Math.round(refreshInterval / 1000);

  let baseMessage: string;
  switch (status) {
    case 'ok':
      baseMessage = 'Database service is healthy and operational.';
      break;
    case 'warning':
      baseMessage = 'Database service has warnings. Some operations may be slow.';
      break;
    case 'error':
      baseMessage = 'Database service is experiencing errors.';
      break;
    default:
      baseMessage = 'Database service status unknown.';
  }

  return `${baseMessage}\n\nRefreshes every ${refreshSeconds}s.`;
}

/**
 * DatabaseStatusIndicator displays the current health status of the database service
 */
export const DatabaseStatusIndicator = React.memo<DatabaseStatusIndicatorProps>(
  ({ showLabel = false, size = 'small' }) => {
    const {
      healthStatus,
      isLoading,
      isError,
      error,
      refreshInterval,
    } = useDatabaseHealth();

    const statusIcon = getStatusIcon(healthStatus, isLoading);
    const statusColor = getStatusColor(healthStatus);
    const statusLabel = getStatusLabel(healthStatus);
    const tooltipMessage = getTooltipMessage(
      healthStatus,
      isLoading,
      isError,
      error,
      refreshInterval,
    );

    const boxSx = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: `${statusColor}.main`,
    };

    if (showLabel) {
      return (
        <Tooltip title={tooltipMessage} arrow>
          <Chip
            icon={statusIcon}
            label={statusLabel}
            color={statusColor}
            size={size}
            variant="outlined"
          />
        </Tooltip>
      );
    }

    return (
      <Tooltip title={tooltipMessage} arrow>
        <Box sx={boxSx}>{statusIcon}</Box>
      </Tooltip>
    );
  },
);

DatabaseStatusIndicator.displayName = 'DatabaseStatusIndicator';
