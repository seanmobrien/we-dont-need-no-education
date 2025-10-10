'use client';

import React, { useState } from 'react';
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
  Switch,
  FormControlLabel,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import RefreshIcon from '@mui/icons-material/Refresh';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { ModelStatistics } from './model-statistics';
import { QueueStatistics } from './queue-statistics';
import { useStatistics } from '@/lib/hooks/use-statistics';

export const StatisticsOverview = () => {
  const [dataSource, setDataSource] = useState<'database' | 'redis'>(
    'database',
  );

  const { models, queues, isLoading, isError, error, refetch } =
    useStatistics(dataSource);

  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return (
      <Alert
        severity="error"
        action={
          <IconButton onClick={refetch} color="inherit" size="small">
            <RefreshIcon />
          </IconButton>
        }
      >
        Error loading statistics: {error?.message || 'Unknown error'}
      </Alert>
    );
  }

  if (!models.data || !queues.data) {
    return <Alert severity="info">No statistics data available</Alert>;
  }

  const totalModels = models.data.length;
  const activeModels = models.data.filter((m) => m.isActive).length;
  const availableModels = models.data.filter((m) => m.available).length;

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography
          variant="h4"
          component="h1"
          color="var(--color-primary-accent)"
        >
          AI Model Statistics
        </Typography>
        <Box display="flex" alignItems="center" gap={2}>
          <FormControlLabel
            control={
              <Switch
                checked={dataSource === 'redis'}
                onChange={(e) =>
                  setDataSource(e.target.checked ? 'redis' : 'database')
                }
                disabled={dataSource === 'redis'} // Disable Redis for now as it's not implemented
              />
            }
            label={
              <Typography variant="body2" color="var(--color-secondary-accent)">
                Redis Data
              </Typography>
            }
          />
          <Tooltip title={`Last updated: ${new Date().toLocaleTimeString()}`}>
            <IconButton onClick={refetch} disabled={isLoading} color="primary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card className="primary">
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Models
              </Typography>
              <Typography variant="h4">{totalModels}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card className="secondary">
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
          <Card className="accent">
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Available Models
              </Typography>
              <Typography variant="h4" color="success.main">
                {availableModels}
              </Typography>
              <Chip
                size="small"
                icon={
                  availableModels === activeModels ? (
                    <CheckCircleIcon />
                  ) : (
                    <ErrorIcon />
                  )
                }
                label={`${Math.round((availableModels / activeModels) * 100)}%`}
                color={availableModels === activeModels ? 'success' : 'warning'}
              />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card className="primary">
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Queued Requests
              </Typography>
              <Typography
                variant="h4"
                color={
                  queues.data.summary.totalPending > 0
                    ? 'warning.main'
                    : 'text.primary'
                }
              >
                {queues.data.summary.totalPending}
              </Typography>
              {queues.data.summary.totalPending > 0 && (
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
          <Typography variant="h6" color="var(--color-primary-accent)">
            Model Performance & Status
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <ModelStatistics models={models.data} />
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6" color="var(--color-primary-accent)">
            Queue Details{' '}
            {queues.data.summary.totalPending > 0 && (
              <Chip
                size="small"
                label={queues.data.summary.totalPending}
                color="warning"
              />
            )}
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <QueueStatistics queues={queues.data} />
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};
