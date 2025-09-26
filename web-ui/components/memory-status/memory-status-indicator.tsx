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
import {
  Chip,
  Tooltip,
  CircularProgress,
  Box,
} from '@mui/material';
import {
  CheckCircle as HealthyIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Memory as MemoryIcon,
} from '@mui/icons-material';
import { useMemoryHealth } from '@/lib/hooks/use-memory-health';
import type { HealthStatus } from '@/lib/ai/mem0/types/health-check';

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
      return <HealthyIcon fontSize="small" />;
    case 'warning':
      return <WarningIcon fontSize="small" />;
    case 'error':
      return <ErrorIcon fontSize="small" />;
    default:
      return <MemoryIcon fontSize="small" />;
  }
}

/**
 * Gets the appropriate color for the health status
 */
function getStatusColor(status: HealthStatus): 'success' | 'warning' | 'error' | 'default' {
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
  isLoading: boolean, 
  isError: boolean, 
  error: Error | null,
  refreshInterval: number
): string {
  if (isLoading) {
    return 'Checking memory service health...';
  }
  
  if (isError && error) {
    return `Memory health check failed: ${error.message}`;
  }

  const refreshSeconds = Math.round(refreshInterval / 1000);
  const baseMessage = (() => {
    switch (status) {
      case 'healthy':
        return 'Memory service is healthy. All systems operational.';
      case 'warning':
        return 'Memory service has warnings. Some services may be unavailable.';
      case 'error':
        return 'Memory service is experiencing errors. Client may be inactive.';
      default:
        return 'Memory service status unknown.';
    }
  })();

  return `${baseMessage} Refreshes every ${refreshSeconds}s.`;
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
export const MemoryStatusIndicator = React.memo<MemoryStatusIndicatorProps>(({
  showLabel = false,
  size = 'medium',
}) => {
  const { 
    healthStatus, 
    isLoading, 
    isError, 
    error, 
    refreshInterval 
  } = useMemoryHealth();

  const statusIcon = getStatusIcon(healthStatus, isLoading);
  const statusColor = getStatusColor(healthStatus);
  const statusLabel = getStatusLabel(healthStatus);
  const tooltipMessage = getTooltipMessage(
    healthStatus, 
    isLoading, 
    isError, 
    error, 
    refreshInterval
  );

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
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: size === 'small' ? 24 : 32,
          minHeight: size === 'small' ? 24 : 32,
          borderRadius: 1,
          color: `${statusColor}.main`,
          cursor: 'pointer',
          '&:hover': {
            backgroundColor: 'action.hover',
          },
        }}
      >
        {statusIcon}
      </Box>
    </Tooltip>
  );
});

MemoryStatusIndicator.displayName = 'MemoryStatusIndicator';