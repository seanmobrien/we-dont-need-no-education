/**
 * @fileoverview Memory Status Indicator Component
 *
 * This component provides a visual indicator for memory service health status
 * with automatic refresh based on health status and integration with react-query.
 *
 * @module components/memory-status/memory-status-indicator
 * @version 1.0.0
 */

'use client';

import * as React from 'react';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import HealthyIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import MemoryIcon from '@mui/icons-material/Memory';
import { useHealth } from '../health-provider/health-context';
import type { HealthStatus } from '@/lib/ai/mem0/types/health-check';
import { BOX_SX_VARIANTS, type BoxSxVariantKey } from '../health-status-styles';

/**
 * Props for the MemoryStatusIndicator component
 */
interface MemoryStatusIndicatorProps {
  /**
   * Whether to show detailed status text alongside the icon
   */
  showLabel?: boolean;

  /**
   * Size variant for the indicator
   */
  size?: 'small' | 'medium';
}

/**
 * Gets the appropriate icon for the health status
 */
function getStatusIcon(status: HealthStatus, isLoading: boolean) {
  if (isLoading) {
    return <CircularProgress size={16} />;
  }

  switch (status) {
    case 'healthy':
      return <HealthyIcon fontSize="small" data-testid='CheckCircleIcon' />;
    case 'warning':
      return <WarningIcon fontSize="small" data-testid='WarningIcon' />;
    case 'error':
      return <ErrorIcon fontSize="small" data-testid='ErrorIcon' />;
    default:
      return <MemoryIcon fontSize="small" data-testid='MemoryIcon' />;
  }
}

/**
 * Gets the appropriate color for the health status
 */
function getStatusColor(
  status: HealthStatus,
): 'success' | 'warning' | 'error' | 'default' {
  switch (status) {
    case 'healthy':
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
function getStatusLabel(status: HealthStatus): string {
  switch (status) {
    case 'healthy':
      return 'Memory: Healthy';
    case 'warning':
      return 'Memory: Warning';
    case 'error':
      return 'Memory: Error';
    default:
      return 'Memory: Unknown';
  }
}

/**
 * Gets the detailed tooltip message based on health status
 */
function getTooltipMessage(
  status: HealthStatus,
  subsystems:
    | {
        db: string;
        vectorStore: string;
        graphStore: string;
        historyStore: string;
        authService: string;
      }
    | undefined,
  isLoading: boolean,
  isError: boolean,
  error: Error | null,
  refreshInterval: number,
): string {
  if (isLoading) {
    return 'Checking memory service health...';
  }

  if (isError && error) {
    return `Memory health check failed: ${error.message}`;
  }

  const refreshSeconds = Math.round(refreshInterval / 1000);

  // Build detailed status message with failing systems information
  let baseMessage: string;
  let systemDetails = '';

  switch (status) {
    case 'healthy':
      baseMessage = 'Memory service is healthy. All systems operational.';
      break;
    case 'warning':
    case 'error':
      baseMessage =
        status === 'warning'
          ? 'Memory service has warnings. Some services may be unavailable.'
          : 'Memory service is experiencing errors. Client may be inactive.';

      // Add details about failing systems if subsystem data is available
      if (subsystems) {
        const failingSystems: string[] = [];
        const systemNames = {
          db: 'Database',
          vectorStore: 'Vector Store',
          graphStore: 'Graph Store',
          historyStore: 'History Store',
          authService: 'Auth Service',
        };

        // Check each subsystem for errors or warnings
        Object.entries(subsystems).forEach(([key, systemStatus]) => {
          if (systemStatus === 'error') {
            failingSystems.push(
              `${systemNames[key as keyof typeof systemNames]} (error)`,
            );
          } else if (systemStatus === 'warning') {
            failingSystems.push(
              `${systemNames[key as keyof typeof systemNames]} (warning)`,
            );
          }
        });

        if (failingSystems.length > 0) {
          systemDetails = `\n\nAffected systems:\n• ${failingSystems.join('\n• ')}`;
        }
      }
      break;
    default:
      baseMessage = 'Memory service status unknown.';
  }

  return `${baseMessage}${systemDetails}\n\nRefreshes every ${refreshSeconds}s.`;
}

/**
 * MemoryStatusIndicator displays the current health status of the memory service
 *
 * @description This component monitors memory service health and provides visual
 * feedback through color-coded indicators. It automatically refreshes at different
 * intervals based on the health status:
 * - Healthy: Every 3 minutes
 * - Warning: Every 30 seconds
 * - Error: Every 5 seconds
 *
 * @component
 * @param props - Component props
 * @returns A React element showing memory service health status
 *
 * @example
 * ```tsx
 * // Basic usage with icon only
 * <MemoryStatusIndicator />
 *
 * // With label text
 * <MemoryStatusIndicator showLabel />
 *
 * // Small size variant
 * <MemoryStatusIndicator size="small" />
 * ```
 */
export const MemoryStatusIndicator = React.memo<MemoryStatusIndicatorProps>(
  ({ showLabel = false, size = 'medium' }) => {
    const healthProps = useHealth();
    const {
      health: {
        memory: { status: healthStatus, subsystems },
      },
      isLoading,
      isError,
      error,
      refreshInterval,
    } = healthProps;

    const statusIcon = getStatusIcon(healthStatus, isLoading);
    const statusColor = getStatusColor(healthStatus);
    const statusLabel = getStatusLabel(healthStatus);
    const tooltipMessage = getTooltipMessage(
      healthStatus,
      subsystems,
      isLoading,
      isError,
      error,
      refreshInterval,
    );

    // Direct lookup of pre-computed stable object - zero object creation!
    const boxSx = BOX_SX_VARIANTS[`${statusColor}-${size}` as BoxSxVariantKey];

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

MemoryStatusIndicator.displayName = 'MemoryStatusIndicator';
