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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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

interface QueueInfo {
  classification: string;
  queues: {
    generation1: { size: number; requests: QueueRequest[] };
    generation2: { size: number; requests: QueueRequest[] };
  };
  totalPending: number;
}

interface QueueStatisticsProps {
  queues: {
    summary: { totalPending: number; totalGen1: number; totalGen2: number };
    queues: QueueInfo[];
  };
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

function RequestDetailsDialog({ 
  request, 
  open, 
  onClose 
}: { 
  request: QueueRequest | null; 
  open: boolean; 
  onClose: () => void; 
}) {
  if (!request) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Request Details - {request.id}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Metadata
                </Typography>
                <Typography variant="body2">
                  <strong>Classification:</strong> {request.modelClassification}
                </Typography>
                <Typography variant="body2">
                  <strong>Generation:</strong> {request.metadata.generation}
                </Typography>
                <Typography variant="body2">
                  <strong>Submitted:</strong> {new Date(request.metadata.submittedAt).toLocaleString()}
                </Typography>
                <Typography variant="body2">
                  <strong>Queue Time:</strong> {formatDuration(request.queueTime)}
                </Typography>
                {request.tokenEstimate && (
                  <Typography variant="body2">
                    <strong>Est. Tokens:</strong> {request.tokenEstimate}
                  </Typography>
                )}
                {request.metadata.userId && (
                  <Typography variant="body2">
                    <strong>User ID:</strong> {request.metadata.userId}
                  </Typography>
                )}
                {request.metadata.chatHistoryId && (
                  <Typography variant="body2">
                    <strong>Chat ID:</strong> {request.metadata.chatHistoryId}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Messages
                </Typography>
                <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                  {request.request.messages && request.request.messages.length > 0 ? (
                    request.request.messages.map((message, index: number) => (
                      <Box key={index} mb={1} p={1} bgcolor="grey.50" borderRadius={1}>
                        <Typography variant="caption" color="primary">
                          {message.role || 'unknown'}:
                        </Typography>
                        <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                          {typeof message.content === 'string' 
                            ? message.content.substring(0, 200) + (message.content.length > 200 ? '...' : '')
                            : JSON.stringify(message.content).substring(0, 200) + '...'
                          }
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
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

function QueueTable({ 
  requests, 
  title 
}: { 
  requests: QueueRequest[]; 
  title: string; 
}) {
  const [selectedRequest, setSelectedRequest] = useState<QueueRequest | null>(null);
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
      <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
        {title} ({requests.length} requests)
      </Typography>
      <TableContainer component={Paper} variant="outlined">
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
                  <Typography variant="body2" fontFamily="monospace">
                    {request.id.substring(0, 8)}...
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    icon={<AccessTimeIcon />}
                    label={formatDuration(request.queueTime)}
                    color={request.queueTime > 300000 ? "error" : request.queueTime > 60000 ? "warning" : "default"}
                  />
                </TableCell>
                <TableCell>
                  {request.tokenEstimate ? (
                    <Chip
                      size="small"
                      icon={<TokenIcon />}
                      label={request.tokenEstimate}
                      variant="outlined"
                    />
                  ) : (
                    <Typography variant="body2" color="textSecondary">
                      N/A
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {new Date(request.metadata.submittedAt).toLocaleTimeString()}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Tooltip title="View request details">
                    <IconButton
                      size="small"
                      onClick={() => handleViewRequest(request)}
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
}

export function QueueStatistics({ queues }: QueueStatisticsProps) {
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
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Generation 1 Queue
              </Typography>
              <Typography variant="h5">
                {queues.summary.totalGen1}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Generation 2 Queue
              </Typography>
              <Typography variant="h5" color="warning.main">
                {queues.summary.totalGen2}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Card>
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
              <Typography variant="h6">
                {queueInfo.classification.toUpperCase()} Models
                <Chip 
                  size="small" 
                  label={queueInfo.totalPending} 
                  color="warning" 
                  sx={{ ml: 1 }} 
                />
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <QueueTable
                requests={queueInfo.queues.generation1.requests}
                title="Generation 1 Queue"
              />
              <QueueTable
                requests={queueInfo.queues.generation2.requests}
                title="Generation 2 Queue"
              />
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Box>
  );
}