'use client';

import React, { useState, useEffect } from 'react';
import {
  Typography,
  Card,
  CardContent,
  Box,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import RefreshIcon from '@mui/icons-material/Refresh';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { ModelStatistics } from './model-statistics';
import { QueueStatistics } from './queue-statistics';

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

interface QueueInfo {
  classification: string;
  queues: {
    generation1: { size: number; requests: QueueRequest[] };
    generation2: { size: number; requests: QueueRequest[] };
  };
  totalPending: number;
}

interface QueueRequest {
  id: string;
  modelClassification: string;
  request: {
    params: Record<string, unknown>;
    messages: Array<{ role?: string; content?: string }>;
  };
  metadata: {
    submittedAt: string;
    generation: 1 | 2;
    chatHistoryId?: string;
    userId?: string;
  };
  queueTime: number;
  tokenEstimate?: number;
}

interface StatisticsData {
  models: ModelStat[];
  queues: {
    summary: { totalPending: number; totalGen1: number; totalGen2: number };
    queues: QueueInfo[];
  };
}

export function StatisticsOverview() {
  const [data, setData] = useState<StatisticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [modelsResponse, queuesResponse] = await Promise.all([
        fetch('/api/statistics/models'),
        fetch('/api/statistics/queues'),
      ]);

      if (!modelsResponse.ok || !queuesResponse.ok) {
        throw new Error('Failed to fetch statistics data');
      }

      const [modelsData, queuesData] = await Promise.all([
        modelsResponse.json() as Promise<{ success: boolean; data: ModelStat[] }>,
        queuesResponse.json() as Promise<{ 
          success: boolean; 
          data: {
            summary: { totalPending: number; totalGen1: number; totalGen2: number };
            queues: QueueInfo[];
          } 
        }>,
      ]);

      if (!modelsData.success || !queuesData.success) {
        throw new Error('API returned error response');
      }

      setData({
        models: modelsData.data,
        queues: queuesData.data,
      });
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" action={
        <IconButton onClick={fetchData} color="inherit" size="small">
          <RefreshIcon />
        </IconButton>
      }>
        Error loading statistics: {error}
      </Alert>
    );
  }

  if (!data) {
    return (
      <Alert severity="info">
        No statistics data available
      </Alert>
    );
  }

  const totalModels = data.models.length;
  const activeModels = data.models.filter(m => m.isActive).length;
  const availableModels = data.models.filter(m => m.available).length;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          AI Model Statistics
        </Typography>
        <Tooltip title={`Last updated: ${lastRefresh.toLocaleTimeString()}`}>
          <IconButton onClick={fetchData} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Models
              </Typography>
              <Typography variant="h4">
                {totalModels}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Active Models
              </Typography>
              <Typography variant="h4" color="primary">
                {activeModels}
              </Typography>
              <Chip 
                size="small" 
                icon={<CheckCircleIcon />} 
                label={`${Math.round((activeModels / totalModels) * 100)}%`} 
                color="success"
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Available Models
              </Typography>
              <Typography variant="h4" color="success.main">
                {availableModels}
              </Typography>
              <Chip 
                size="small" 
                icon={availableModels === activeModels ? <CheckCircleIcon /> : <ErrorIcon />} 
                label={`${Math.round((availableModels / activeModels) * 100)}%`} 
                color={availableModels === activeModels ? "success" : "warning"}
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Queued Requests
              </Typography>
              <Typography variant="h4" color={data.queues.summary.totalPending > 0 ? "warning.main" : "text.primary"}>
                {data.queues.summary.totalPending}
              </Typography>
              {data.queues.summary.totalPending > 0 && (
                <Chip 
                  size="small" 
                  icon={<ErrorIcon />} 
                  label="Pending" 
                  color="warning"
                />
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Detailed Statistics */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Model Performance & Status</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <ModelStatistics models={data.models} />
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">
            Queue Details {data.queues.summary.totalPending > 0 && (
              <Chip size="small" label={data.queues.summary.totalPending} color="warning" />
            )}
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <QueueStatistics queues={data.queues} />
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}