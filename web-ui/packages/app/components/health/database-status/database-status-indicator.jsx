'use client';
import * as React from 'react';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import HealthyIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import DatabaseIcon from '@mui/icons-material/Storage';
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
            return <DatabaseIcon fontSize="small" data-testid='StorageIcon'/>;
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
            return 'Database: Healthy';
        case 'warning':
            return 'Database: Warning';
        case 'error':
            return 'Database: Error';
        default:
            return 'Database: Unknown';
    }
}
function getTooltipMessage(status, isLoading, isError, error, refreshInterval) {
    if (isLoading) {
        return 'Checking database service health...';
    }
    if (isError && error) {
        return `Database health check failed: ${error.message}`;
    }
    const refreshSeconds = Math.round(refreshInterval / 1000);
    let baseMessage;
    switch (status) {
        case 'healthy':
            baseMessage = 'Database service is healthy and operational.';
            break;
        case 'warning':
            baseMessage =
                'Database service has warnings. Some operations may be slow.';
            break;
        case 'error':
            baseMessage = 'Database service is experiencing errors.';
            break;
        default:
            baseMessage = 'Database service status unknown.';
    }
    return `${baseMessage}\n\nRefreshes every ${refreshSeconds}s.`;
}
export const DatabaseStatusIndicator = React.memo(({ showLabel = false, size = 'medium' }) => {
    const { health: { database: databaseStatus }, isLoading, isError, error, refreshInterval, } = useHealth();
    const healthStatus = databaseStatus || 'warning';
    const statusIcon = getStatusIcon(healthStatus, isLoading);
    const statusColor = getStatusColor(healthStatus);
    const statusLabel = getStatusLabel(healthStatus);
    const tooltipMessage = getTooltipMessage(healthStatus, isLoading, isError, error, refreshInterval);
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
DatabaseStatusIndicator.displayName = 'DatabaseStatusIndicator';
//# sourceMappingURL=database-status-indicator.jsx.map