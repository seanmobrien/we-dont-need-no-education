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
            return <MemoryIcon fontSize="small" data-testid='MemoryIcon'/>;
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
            return 'Memory: Healthy';
        case 'warning':
            return 'Memory: Warning';
        case 'error':
            return 'Memory: Error';
        default:
            return 'Memory: Unknown';
    }
}
function getTooltipMessage(status, subsystems, isLoading, isError, error, refreshInterval) {
    if (isLoading) {
        return 'Checking memory service health...';
    }
    if (isError && error) {
        return `Memory health check failed: ${error.message}`;
    }
    const refreshSeconds = Math.round(refreshInterval / 1000);
    let baseMessage;
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
            if (subsystems) {
                const failingSystems = [];
                const systemNames = {
                    db: 'Database',
                    vectorStore: 'Vector Store',
                    graphStore: 'Graph Store',
                    historyStore: 'History Store',
                    authService: 'Auth Service',
                };
                Object.entries(subsystems).forEach(([key, systemStatus]) => {
                    if (systemStatus === 'error') {
                        failingSystems.push(`${systemNames[key]} (error)`);
                    }
                    else if (systemStatus === 'warning') {
                        failingSystems.push(`${systemNames[key]} (warning)`);
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
export const MemoryStatusIndicator = React.memo(({ showLabel = false, size = 'medium' }) => {
    const healthProps = useHealth();
    const { health: { memory: { status: healthStatus, subsystems }, }, isLoading, isError, error, refreshInterval, } = healthProps;
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
MemoryStatusIndicator.displayName = 'MemoryStatusIndicator';
//# sourceMappingURL=memory-status-indicator.jsx.map