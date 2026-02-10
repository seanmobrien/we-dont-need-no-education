'use client';

import React from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import LinearProgress from '@mui/material/LinearProgress';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import type { ModelStat } from '@/types/statistics';
import {
  formatNumber,
  getUsagePercentage,
  getUsageColor,
} from '@/lib/site-util/format';

interface ModelStatisticsProps {
  models: ModelStat[];
}

export const ModelStatistics = ({ models }: ModelStatisticsProps) => {
  if (models.length === 0) {
    return (
      <Typography variant="body2" color="textSecondary">
        No models configured
      </Typography>
    );
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Model</TableCell>
            <TableCell>Provider</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="center">Minute Usage</TableCell>
            <TableCell align="center">Hour Usage</TableCell>
            <TableCell align="center">Day Usage</TableCell>
            <TableCell align="center">Requests</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {models.map((model) => {
            const minuteUsage = getUsagePercentage(
              model.stats.minute.totalTokens,
              model.maxTokensPerMinute,
            );
            const dayUsage = getUsagePercentage(
              model.stats.day.totalTokens,
              model.maxTokensPerDay,
            );

            return (
              <TableRow key={model.id} hover>
                <TableCell>
                  <Box>
                    <Typography
                      variant="body2"
                      fontWeight="medium"
                      color="var(--color-primary-accent)"
                    >
                      {model.displayName || model.modelName}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="var(--color-secondary-accent)"
                    >
                      {model.modelKey}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography
                    variant="body2"
                    color="var(--color-primary-accent)"
                  >
                    {model.providerDisplayName}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box display="flex" gap={1} flexWrap="wrap">
                    {model.isActive ? (
                      <Chip
                        size="small"
                        icon={<CheckCircleIcon />}
                        label="Active"
                        color="primary"
                        className="primary"
                      />
                    ) : (
                      <Chip
                        size="small"
                        icon={<PauseCircleIcon />}
                        label="Inactive"
                        color="default"
                        className="secondary"
                      />
                    )}
                    {model.isActive && (
                      <Chip
                        size="small"
                        icon={
                          model.available ? <CheckCircleIcon /> : <ErrorIcon />
                        }
                        label={model.available ? 'Available' : 'Unavailable'}
                        color={model.available ? 'success' : 'error'}
                        className={model.available ? 'accent' : 'primary'}
                      />
                    )}
                  </Box>
                </TableCell>
                <TableCell align="center">
                  <Box minWidth={100}>
                    <Typography
                      variant="body2"
                      color="var(--color-primary-accent)"
                    >
                      {formatNumber(model.stats.minute.totalTokens)}
                      {model.maxTokensPerMinute &&
                        ` / ${formatNumber(model.maxTokensPerMinute)}`}
                    </Typography>
                    {model.maxTokensPerMinute && (
                      <Tooltip title={`${minuteUsage.toFixed(1)}% of limit`}>
                        <LinearProgress
                          variant="determinate"
                          value={minuteUsage}
                          color={getUsageColor(minuteUsage)}
                          sx={{ mt: 0.5, height: 4 }}
                        />
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
                <TableCell align="center">
                  <Typography
                    variant="body2"
                    color="var(--color-primary-accent)"
                  >
                    {formatNumber(model.stats.hour.totalTokens)}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Box minWidth={100}>
                    <Typography
                      variant="body2"
                      color="var(--color-primary-accent)"
                    >
                      {formatNumber(model.stats.day.totalTokens)}
                      {model.maxTokensPerDay &&
                        ` / ${formatNumber(model.maxTokensPerDay)}`}
                    </Typography>
                    {model.maxTokensPerDay && (
                      <Tooltip title={`${dayUsage.toFixed(1)}% of daily limit`}>
                        <LinearProgress
                          variant="determinate"
                          value={dayUsage}
                          color={getUsageColor(dayUsage)}
                          sx={{ mt: 0.5, height: 4 }}
                        />
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
                <TableCell align="center">
                  <Box>
                    <Typography
                      variant="body2"
                      color="var(--color-secondary-accent)"
                    >
                      M: {model.stats.minute.requestCount}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="var(--color-secondary-accent)"
                    >
                      H: {model.stats.hour.requestCount}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="var(--color-secondary-accent)"
                    >
                      D: {model.stats.day.requestCount}
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
