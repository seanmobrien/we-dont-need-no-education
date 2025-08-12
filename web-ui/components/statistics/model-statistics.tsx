'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Typography,
  Box,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';

interface ModelStat {
  id: string;
  modelName: string;
  displayName: string;
  description: string;
  isActive: boolean;
  providerId: string;
  providerName: string;
  providerDisplayName: string;
  maxTokensPerMessage: number;
  maxTokensPerMinute: number;
  maxTokensPerDay: number;
  modelKey: string;
  available: boolean;
  stats: {
    minute: { promptTokens: number; completionTokens: number; totalTokens: number; requestCount: number };
    hour: { promptTokens: number; completionTokens: number; totalTokens: number; requestCount: number };
    day: { promptTokens: number; completionTokens: number; totalTokens: number; requestCount: number };
  };
}

interface ModelStatisticsProps {
  models: ModelStat[];
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

function getUsagePercentage(used: number, limit: number | null): number {
  if (!limit || limit === 0) return 0;
  return Math.min((used / limit) * 100, 100);
}

function getUsageColor(percentage: number): 'success' | 'warning' | 'error' {
  if (percentage < 70) return 'success';
  if (percentage < 90) return 'warning';
  return 'error';
}

export function ModelStatistics({ models }: ModelStatisticsProps) {
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
            const minuteUsage = getUsagePercentage(model.stats.minute.totalTokens, model.maxTokensPerMinute);
            const dayUsage = getUsagePercentage(model.stats.day.totalTokens, model.maxTokensPerDay);

            return (
              <TableRow key={model.id} hover>
                <TableCell>
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      {model.displayName || model.modelName}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {model.modelKey}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
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
                      />
                    ) : (
                      <Chip
                        size="small"
                        icon={<PauseCircleIcon />}
                        label="Inactive"
                        color="default"
                      />
                    )}
                    {model.isActive && (
                      <Chip
                        size="small"
                        icon={model.available ? <CheckCircleIcon /> : <ErrorIcon />}
                        label={model.available ? "Available" : "Unavailable"}
                        color={model.available ? "success" : "error"}
                      />
                    )}
                  </Box>
                </TableCell>
                <TableCell align="center">
                  <Box minWidth={100}>
                    <Typography variant="body2">
                      {formatNumber(model.stats.minute.totalTokens)}
                      {model.maxTokensPerMinute && ` / ${formatNumber(model.maxTokensPerMinute)}`}
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
                  <Typography variant="body2">
                    {formatNumber(model.stats.hour.totalTokens)}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Box minWidth={100}>
                    <Typography variant="body2">
                      {formatNumber(model.stats.day.totalTokens)}
                      {model.maxTokensPerDay && ` / ${formatNumber(model.maxTokensPerDay)}`}
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
                    <Typography variant="body2">
                      M: {model.stats.minute.requestCount}
                    </Typography>
                    <Typography variant="body2">
                      H: {model.stats.hour.requestCount}
                    </Typography>
                    <Typography variant="body2">
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
}