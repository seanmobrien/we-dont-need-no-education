/**
 * @fileoverview Chat Status Indicator Component
 *
 * This component provides a visual indicator for chat service health status.
 *
 * @module components/chat-status/chat-status-indicator
 * @version 1.0.0
 */

'use client';

import * as React from 'react';
import { Chip, Tooltip, CircularProgress, Box } from '@mui/material';
import {
  CheckCircle as HealthyIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Chat as ChatIcon,
} from '@mui/icons-material';
import { useChatHealth } from '@/lib/hooks/use-chat-health';
import { BOX_SX_VARIANTS, BoxSxVariantKey } from '../health-status-styles';

/**
 * Props for the ChatStatusIndicator component
 */
interface ChatStatusIndicatorProps {
  /**
   * Whether to show detailed status text alongside the icon
   */
  showLabel?: boolean;

  /**
   * Size variant for the indicator
   */
  size?: 'small' | 'medium';
}

type ChatHealthStatus = 'ok' | 'warning' | 'error';

/**
 * Gets the appropriate icon for the health status
 */
function getStatusIcon(status: ChatHealthStatus, isLoading: boolean) {
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
      return <ChatIcon fontSize="small" />;
  }
}

/**
 * Gets the appropriate color for the health status
 */
function getStatusColor(
  status: ChatHealthStatus,
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
function getStatusLabel(status: ChatHealthStatus): string {
  switch (status) {
    case 'ok':
      return 'Chat: Healthy';
    case 'warning':
      return 'Chat: Warning';
    case 'error':
      return 'Chat: Error';
    default:
      return 'Chat: Unknown';
  }
}

/**
 * Gets the detailed tooltip message based on health status
 */
function getTooltipMessage(
  status: ChatHealthStatus,
  subsystems:
    | {
        cache: ChatHealthStatus;
        queue: ChatHealthStatus;
      }
    | undefined,
  isLoading: boolean,
  isError: boolean,
  error: Error | null,
  refreshInterval: number,
): string {
  if (isLoading) {
    return 'Checking chat service health...';
  }

  if (isError && error) {
    return `Chat health check failed: ${error.message}`;
  }

  const refreshSeconds = Math.round(refreshInterval / 1000);

  let baseMessage: string;
  let systemDetails = '';

  switch (status) {
    case 'ok':
      baseMessage = 'Chat service is healthy and operational.';
      break;
    case 'warning':
    case 'error':
      baseMessage =
        status === 'warning'
          ? 'Chat service has warnings. Some features may be unavailable.'
          : 'Chat service is experiencing errors.';

      if (subsystems) {
        const failingSystems: string[] = [];
        if (subsystems.cache !== 'ok') {
          failingSystems.push(`Cache (${subsystems.cache})`);
        }
        if (subsystems.queue !== 'ok') {
          failingSystems.push(`Queue (${subsystems.queue})`);
        }

        if (failingSystems.length > 0) {
          systemDetails = `\n\nAffected systems:\n• ${failingSystems.join('\n• ')}`;
        }
      }
      break;
    default:
      baseMessage = 'Chat service status unknown.';
  }

  return `${baseMessage}${systemDetails}\n\nRefreshes every ${refreshSeconds}s.`;
}

/**
 * ChatStatusIndicator displays the current health status of the chat service
 */
export const ChatStatusIndicator = React.memo<ChatStatusIndicatorProps>(
  ({ showLabel = false, size = 'medium' }) => {
    const {
      healthStatus,
      subsystems,
      isLoading,
      isError,
      error,
      refreshInterval,
    } = useChatHealth();

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

ChatStatusIndicator.displayName = 'ChatStatusIndicator';
