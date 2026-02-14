'use client';
import * as React from 'react';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import HealthyIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import ChatIcon from '@mui/icons-material/Chat';
import { useHealth } from '../health-provider/health-context';
import { BOX_SX_VARIANTS } from '../health-status-styles';
function getStatusIcon(status, isLoading) {
    if (isLoading) {
        return <CircularProgress size={16}/>;
    }
    switch (status) {
        case 'healthy':
            return <HealthyIcon fontSize="small" data-testid='CheckCircleIcon'/>;
        case 'warning':
            return <WarningIcon fontSize="small" data-testid='WarningIcon'/>;
        case 'error':
            return <ErrorIcon fontSize="small" data-testid='ErrorIcon'/>;
        default:
            return <ChatIcon fontSize="small" data-testid='ChatIcon'/>;
    }
}
function getStatusColor(status) {
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
function getStatusLabel(status) {
    switch (status) {
        case 'healthy':
            return 'Chat: Healthy';
        case 'warning':
            return 'Chat: Warning';
        case 'error':
            return 'Chat: Error';
        default:
            return 'Chat: Unknown';
    }
}
function getTooltipMessage(status, subsystems, isLoading, isError, error, refreshInterval) {
    if (isLoading) {
        return 'Checking chat service health...';
    }
    if (isError && error) {
        return `Chat health check failed: ${error.message}`;
    }
    const refreshSeconds = Math.round(refreshInterval / 1000);
    let baseMessage;
    let systemDetails = '';
    switch (status) {
        case 'healthy':
            baseMessage = 'Chat service is healthy and operational.';
            break;
        case 'warning':
        case 'error':
            baseMessage =
                status === 'warning'
                    ? 'Chat service has warnings. Some features may be unavailable.'
                    : 'Chat service is experiencing errors.';
            if (subsystems) {
                const failingSystems = [];
                if (subsystems.cache !== 'healthy') {
                    failingSystems.push(`Cache (${subsystems.cache})`);
                }
                if (subsystems.queue !== 'healthy') {
                    failingSystems.push(`Queue (${subsystems.queue})`);
                }
                if (subsystems.tools !== 'healthy') {
                    failingSystems.push(`Tools (${subsystems.tools})`);
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
export const ChatStatusIndicator = React.memo(({ showLabel = false, size = 'medium' }) => {
    const { health: { chat: chatData }, isLoading, isError, error, refreshInterval, } = useHealth();
    const healthStatus = chatData?.status ?? 'error';
    const subsystems = chatData?.subsystems;
    const statusIcon = getStatusIcon(healthStatus, isLoading);
    const statusColor = getStatusColor(healthStatus);
    const statusLabel = getStatusLabel(healthStatus);
    const tooltipMessage = getTooltipMessage(healthStatus, subsystems, isLoading, isError, error, refreshInterval);
    const boxSx = BOX_SX_VARIANTS[`${statusColor}-${size}`];
    if (showLabel) {
        return (<Tooltip title={tooltipMessage} arrow>
          <Chip icon={statusIcon} label={statusLabel} color={statusColor} size={size} variant="outlined"/>
        </Tooltip>);
    }
    return (<Tooltip title={tooltipMessage} arrow>
        <Box sx={boxSx}>{statusIcon}</Box>
      </Tooltip>);
});
ChatStatusIndicator.displayName = 'ChatStatusIndicator';
//# sourceMappingURL=chat-status-indicator.jsx.map