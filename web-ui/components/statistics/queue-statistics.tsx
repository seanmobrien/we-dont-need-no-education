'use client';

import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  IconButton,
  Tooltip,
  Card,
  CardContent,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import TokenIcon from '@mui/icons-material/Token';
import ResizableDraggableDialog from '@/components/mui/resizeable-draggable-dialog';
import type { QueueInfo, QueueRequest } from '@/types/statistics';
import { formatDuration, formatElapsed } from '@/lib/site-util/format';

interface QueueStatisticsProps {
  queues: {
    summary: { totalPending: number; totalGen1: number; totalGen2: number };
    queues: QueueInfo[];
  };
}

const RequestDetailsDialog = ({
  request,
  open,
  onClose,
}: {
  request: QueueRequest | null;
  open: boolean;
  onClose: () => void;
}) => {
  if (!request) return null;

  return (
    <ResizableDraggableDialog
      isOpenState={open}
      title={`Request Details - ${request.id}`}
      modal={false}
      initialWidth={800}
      initialHeight={600}
      onClose={onClose}
    >
      <Grid container spacing={2} sx={{ p: 2 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined" className="primary">
            <CardContent>
              <Typography
                variant="h6"
                gutterBottom
                color="var(--color-primary-accent)"
              >
                Metadata
              </Typography>
              <Typography variant="body2" color="var(--color-secondary-accent)">
                <strong>Classification:</strong> {request.modelClassification}
              </Typography>
              <Typography variant="body2" color="var(--color-secondary-accent)">
                <strong>Generation:</strong> {request.metadata.generation}
              </Typography>
              <Typography variant="body2" color="var(--color-secondary-accent)">
                <strong>Submitted:</strong>{' '}
                {new Date(request.metadata.submittedAt).toLocaleString()}
              </Typography>
              <Typography variant="body2" color="var(--color-secondary-accent)">
                <strong>Queue Time:</strong> {formatDuration(request.queueTime)}
              </Typography>
              {request.tokenEstimate && (
                <Typography
                  variant="body2"
                  color="var(--color-secondary-accent)"
                >
                  <strong>Est. Tokens:</strong> {request.tokenEstimate}
                </Typography>
              )}
              {request.metadata.userId && (
                <Typography
                  variant="body2"
                  color="var(--color-secondary-accent)"
                >
                  <strong>User ID:</strong> {request.metadata.userId}
                </Typography>
              )}
              {request.metadata.chatHistoryId && (
                <Typography
                  variant="body2"
                  color="var(--color-secondary-accent)"
                >
                  <strong>Chat ID:</strong> {request.metadata.chatHistoryId}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined" className="secondary">
            <CardContent>
              <Typography
                variant="h6"
                gutterBottom
                color="var(--color-primary-accent)"
              >
                Messages
              </Typography>
              <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                {request.request.messages &&
                request.request.messages.length > 0 ? (
                  request.request.messages.map((message, index: number) => (
                    <Box
                      key={index}
                      mb={1}
                      p={1}
                      bgcolor="grey.50"
                      borderRadius={1}
                      className="accent"
                    >
                      <Typography
                        variant="caption"
                        color="var(--color-primary-accent)"
                      >
                        {message.role || 'unknown'}:
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ wordBreak: 'break-word' }}
                        color="var(--color-secondary-accent)"
                      >
                        {typeof message.content === 'string'
                          ? message.content.substring(0, 200) +
                            (message.content.length > 200 ? '...' : '')
                          : JSON.stringify(message.content).substring(0, 200) +
                            '...'}
                      </Typography>
                    </Box>
                  ))
                ) : (
                  <Typography variant="body2" color="textSecondary">
                    No messages
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          onClick={onClose}
          color="primary"
          variant="contained"
          className="primary"
        >
          Close
        </Button>
      </Box>
    </ResizableDraggableDialog>
  );
};

const QueueTable = ({
  requests,
  title,
}: {
  requests: QueueRequest[];
  title: string;
}) => {
  const [selectedRequest, setSelectedRequest] = useState<QueueRequest | null>(
    null,
  );
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleViewRequest = (request: QueueRequest) => {
    setSelectedRequest(request);
    setDialogOpen(true);
  };

  if (requests.length === 0) {
    return (
      <Typography variant="body2" color="textSecondary" sx={{ p: 2 }}>
        No requests in {title.toLowerCase()}
      </Typography>
    );
  }

  return (
    <>
      <Typography
        variant="subtitle1"
        gutterBottom
        sx={{ mt: 2 }}
        color="var(--color-primary-accent)"
      >
        {title} ({requests.length} requests)
      </Typography>
      <TableContainer
        component={Paper}
        variant="outlined"
        className="secondary"
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Request ID</TableCell>
              <TableCell>Queue Time</TableCell>
              <TableCell>Est. Tokens</TableCell>
              <TableCell>Submitted</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {requests.map((request) => (
              <TableRow key={request.id} hover>
                <TableCell>
                  <Typography
                    variant="body2"
                    fontFamily="monospace"
                    color="var(--color-primary-accent)"
                  >
                    {request.id.substring(0, 8)}...
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    icon={<AccessTimeIcon />}
                    label={formatDuration(request.queueTime)}
                    color={
                      request.queueTime > 300000
                        ? 'error'
                        : request.queueTime > 60000
                          ? 'warning'
                          : 'default'
                    }
                    className="accent"
                  />
                </TableCell>
                <TableCell>
                  {request.tokenEstimate ? (
                    <Chip
                      size="small"
                      icon={<TokenIcon />}
                      label={request.tokenEstimate}
                      variant="outlined"
                      className="primary"
                    />
                  ) : (
                    <Typography variant="body2" color="textSecondary">
                      N/A
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Typography
                    variant="body2"
                    color="var(--color-secondary-accent)"
                  >
                    {new Date(
                      request.metadata.submittedAt,
                    ).toLocaleTimeString()}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Tooltip title="View request details">
                    <IconButton
                      size="small"
                      onClick={() => handleViewRequest(request)}
                      color="primary"
                    >
                      <VisibilityIcon />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <RequestDetailsDialog
        request={selectedRequest}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </>
  );
};

const QueueGenerationDetails = ({
  generation,
  queueData,
}: {
  generation: 1 | 2;
  queueData: QueueInfo['queues']['generation1'];
}) => {
  return (
    <Card
      variant="outlined"
      className={generation === 1 ? 'primary' : 'secondary'}
    >
      <CardContent>
        <Typography
          variant="h6"
          gutterBottom
          color="var(--color-primary-accent)"
        >
          Generation {generation} Queue ({queueData.size} requests)
        </Typography>

        <Box display="flex" flexWrap="wrap" gap={2} mb={2}>
          {queueData.oldestRequest && (
            <Chip
              size="small"
              label={`Oldest: ${formatElapsed(queueData.oldestRequest)}`}
              color="warning"
              className="accent"
            />
          )}
          {queueData.newestRequest && (
            <Chip
              size="small"
              label={`Newest: ${formatElapsed(queueData.newestRequest)}`}
              color="info"
              className="secondary"
            />
          )}
          <Chip
            size="small"
            label={`Avg Size: ${Math.round(queueData.averageSize)} chars`}
            variant="outlined"
            className="primary"
          />
          {queueData.largestRequest && (
            <Chip
              size="small"
              label={`Largest: ${queueData.largestRequest.request.messages?.map((m) => m.content || '').join('').length || 0} chars`}
              variant="outlined"
              color="secondary"
              className="accent"
            />
          )}
        </Box>

        <QueueTable
          requests={queueData.requests}
          title={`Generation ${generation} Requests`}
        />
      </CardContent>
    </Card>
  );
};

export const QueueStatistics = ({ queues }: QueueStatisticsProps) => {
  if (queues.summary.totalPending === 0) {
    return (
      <Typography variant="body2" color="textSecondary">
        No pending requests in any queues
      </Typography>
    );
  }

  return (
    <Box>
      {/* Summary */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card className="primary">
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Generation 1 Queue
              </Typography>
              <Typography variant="h5" color="var(--color-primary-accent)">
                {queues.summary.totalGen1}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card className="secondary">
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Generation 2 Queue
              </Typography>
              <Typography variant="h5" color="var(--color-secondary-accent)">
                {queues.summary.totalGen2}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card className="accent">
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Pending
              </Typography>
              <Typography variant="h5" color="error.main">
                {queues.summary.totalPending}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Queue Details by Classification */}
      {queues.queues.map((queueInfo) => {
        if (queueInfo.totalPending === 0) return null;

        return (
          <Accordion key={queueInfo.classification}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6" color="var(--color-primary-accent)">
                {queueInfo.classification.toUpperCase()} Models
                <Chip
                  size="small"
                  label={queueInfo.totalPending}
                  color="warning"
                  sx={{ ml: 1 }}
                  className="accent"
                />
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <QueueGenerationDetails
                    generation={1}
                    queueData={queueInfo.queues.generation1}
                  />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <QueueGenerationDetails
                    generation={2}
                    queueData={queueInfo.queues.generation2}
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Box>
  );
};
