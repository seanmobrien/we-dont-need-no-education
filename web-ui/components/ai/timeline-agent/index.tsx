'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  CircularProgress,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
  Alert,
} from '@mui/material';
import {
  PlayArrow,
  RestartAlt,
  Description,
  CheckCircle,
  Schedule,
  Warning,
  Info,
  ExpandMore,
  Refresh,
  Save,
  Upload,
} from '@mui/icons-material';
import { useMutation } from '@tanstack/react-query';
import { TimelineAgent } from '@/lib/ai/agents/timeline';
import {
  TimelineSummary,
  ProcessingResult,
  ComplianceRating,
} from '@/lib/ai/agents/timeline/types';
import { log } from '@/lib/logger';
import { ClientTimelineAgent } from '@/lib/ai/agents/timeline/agent';
import { useNotifications } from '@toolpad/core/useNotifications';

interface TimelineAgentInterfaceProps {
  initialDocumentId: string;
  caseId: string;
}

interface AgentState {
  agent: TimelineAgent | null;
  isInitialized: boolean;
  isProcessing: boolean;
  currentDocument: string | null;
  summary: TimelineSummary | null;
  lastResult: ProcessingResult | null;
  error: string | null;
}

const getComplianceColor = (rating: ComplianceRating): string => {
  switch (rating) {
    case ComplianceRating.Excellent:
      return '#4caf50';
    case ComplianceRating.Good:
      return '#8bc34a';
    case ComplianceRating.Satisfactory:
      return '#ff9800';
    case ComplianceRating.Poor:
      return '#f44336';
    default:
      return '#9e9e9e';
  }
};

const getComplianceIcon = (rating: ComplianceRating) => {
  switch (rating) {
    case ComplianceRating.Excellent:
    case ComplianceRating.Good:
      return <CheckCircle sx={{ color: getComplianceColor(rating) }} />;
    case ComplianceRating.Satisfactory:
      return <Schedule sx={{ color: getComplianceColor(rating) }} />;
    case ComplianceRating.Poor:
      return <Warning sx={{ color: getComplianceColor(rating) }} />;
    default:
      return <Info sx={{ color: getComplianceColor(rating) }} />;
  }
};

export const TimelineAgentInterface: React.FC<TimelineAgentInterfaceProps> = ({
  initialDocumentId,
  caseId,
}) => {
  const notifications = useNotifications();
  const [state, setState] = useState<AgentState>({
    agent: null,
    isInitialized: false,
    isProcessing: false,
    currentDocument: null,
    summary: null,
    lastResult: null,
    error: null,
  });

  // React Query mutation for server-side initialization
  const {
    mutate,
    isPending,
    isSuccess,
    isError,
    data,
    error: mutationError,
  } = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/ai/agents/timeline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'initialize',
          initialDocumentId,
          propertyId: caseId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to initialize agent');
      }

      return response.json();
    },
    onSuccess: (data) => {
      try {
        // Use the serialization support to restore agent from server response
        if (data.data?.snapshot) {
          const agent = ClientTimelineAgent.fromSnapshot(data.data.snapshot);
          const summary = agent.generateSummary();
          setState({
            agent,
            isInitialized: true,
            isProcessing: false,
            currentDocument: agent.getCurrentDocumentId(),
            summary,
            lastResult: null,
            error: null,
          });
        } /*else {
          // Fallback to local initialization if no snapshot
          const agent = TimelineAgentFactory({ initialDocumentId });
          if (caseId) {
            agent.propertyId = caseId;
          }

          setState((prev) => ({
            ...prev,
            agent,
            isInitialized: true,
            isProcessing: false,
            summary: data.data?.summary || agent.generateSummary(),
            currentDocument: initialDocumentId,
            error: null,
          }));
        }
          */
      } catch (error) {
        throw error;
        /*
        setState((prev) => ({
          ...prev,
          isProcessing: false,
          error:
            error instanceof Error
              ? error.message
              : 'Failed to restore agent state',
        }));
        */
      }
    },
    onError: (error) => {
      throw error;
      /*
      setState((prev) => ({
        ...prev,
        isProcessing: false,
        error:
          error instanceof Error ? error.message : 'Failed to initialize agent',
      }));
      */
    },
  });

  // Initialize the agent using server-side API
  const initializeAgent = useCallback(async () => {
    // setState((prev) => ({ ...prev, isProcessing: true, error: null }));
    mutate();
  }, [mutate]);

  // Process next document
  const processNextDocument = useCallback(async () => {
    if (!state.agent || !state.isInitialized) return;

    try {
      setState((prev) => ({ ...prev, isProcessing: true, error: null }));

      const result = await state.agent.processNextDocument();
      const summary = state.agent.generateSummary();

      setState((prev) => ({
        ...prev,
        isProcessing: false,
        summary,
        lastResult: result,
        currentDocument: result?.documentId || null,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isProcessing: false,
        error:
          error instanceof Error ? error.message : 'Failed to process document',
      }));
    }
  }, [state.agent, state.isInitialized]);

  // Reset agent
  const resetAgent = useCallback(() => {
    if (state.agent) {
      state.agent.reset();
      setState({
        agent: null,
        isInitialized: false,
        isProcessing: false,
        currentDocument: null,
        summary: null,
        lastResult: null,
        error: null,
      });
    }
  }, [state.agent]);

  // Refresh summary
  const refreshSummary = useCallback(() => {
    if (state.agent && state.isInitialized) {
      const summary = state.agent.generateSummary();
      setState((prev) => ({ ...prev, summary }));
    }
  }, [state.agent, state.isInitialized]);

  // Save agent state as snapshot
  const saveSnapshot = useCallback(() => {
    if (!state.agent) return;

    try {
      const snapshot = state.agent.createSnapshot();
      const blob = new Blob([snapshot], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `timeline-agent-${caseId}-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error:
          error instanceof Error ? error.message : 'Failed to save snapshot',
      }));
    }
  }, [state.agent, caseId]);

  // Load agent state from snapshot
  const loadSnapshot = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const snapshot = e.target?.result as string;
        const agent = TimelineAgent.fromSnapshot(snapshot);
        const summary = agent.generateSummary();

        setState({
          agent,
          isInitialized: true,
          isProcessing: false,
          currentDocument: agent.getCurrentDocumentId(),
          summary,
          lastResult: null,
          error: null,
        });
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error:
            error instanceof Error ? error.message : 'Failed to load snapshot',
        }));
      }
    };
    reader.readAsText(file);
  }, []);

  // Handle file input for loading snapshots
  const handleFileInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        loadSnapshot(file);
      }
    },
    [loadSnapshot],
  );

  // Initialize on mount
  useEffect(() => {
    if (!isPending) {
      if (!state.isInitialized) {
        if (isSuccess) {
          log((l) => l.info('Agent initialized successfully'));
        } else {
          if (isError) {
            notifications.show(mutationError.message, {
              severity: 'error',
              autoHideDuration: 60000,
            });
          } else {
            mutate();
          }
        }
      }
    } else {
      if (isError) {
        notifications.show(mutationError.message, {
          severity: 'error',
          autoHideDuration: 60000,
        });
      } else {
        //no-op?
      }
    }
  }, [
    initializeAgent,
    state,
    mutate,
    isPending,
    data,
    isSuccess,
    mutationError,
    isError,
    notifications,
  ]);

  const documentCounts = state.agent?.getDocumentCounts() || {
    pending: 0,
    processed: 0,
    total: 0,
  };
  const hasMoreDocuments = state.agent?.hasMoreDocuments() || false;
  const progressPercentage =
    documentCounts.total > 0
      ? Math.round((documentCounts.processed / documentCounts.total) * 100)
      : 0;

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      {/* Header */}
      <Paper elevation={2} sx={{ p: 2 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2,
          }}
        >
          <Typography variant="h4" component="h1">
            Timeline Analysis Agent
            {!isPending && state.isInitialized && !state.isProcessing && (
              <Chip
                label="Ready"
                color="success"
                variant="outlined"
                sx={{ ml: 3 }}
              />
            )}
          </Typography>
          {state.error && <Alert severity="error">{state.error}</Alert>}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Save Agent State">
              <IconButton
                onClick={saveSnapshot}
                disabled={!state.isInitialized || isPending}
              >
                <Save />
              </IconButton>
            </Tooltip>
            <Tooltip title="Load Agent State">
              <IconButton
                component="label"
                disabled={state.isProcessing || isPending}
              >
                <input
                  type="file"
                  accept=".json"
                  hidden
                  onChange={handleFileInputChange}
                  aria-label="Load agent state file"
                />
                <Upload />
              </IconButton>
            </Tooltip>
            <Tooltip title="Refresh Summary">
              <IconButton
                onClick={refreshSummary}
                disabled={!state.isInitialized || isPending}
              >
                <Refresh />
              </IconButton>
            </Tooltip>
            <Tooltip title="Reset Agent">
              <IconButton
                onClick={resetAgent}
                disabled={state.isProcessing || isPending}
              >
                <RestartAlt />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          Case ID: {caseId} | Initial Document: {initialDocumentId}
        </Typography>

        {/* Progress Indicator */}
        <Box sx={{ mt: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2">
              Progress: {documentCounts.processed} / {documentCounts.total}{' '}
              documents
            </Typography>
            <Typography variant="body2">{progressPercentage}%</Typography>
          </Box>
          <LinearProgress
            variant={isPending ? 'indeterminate' : 'determinate'}
            value={isPending ? undefined : progressPercentage}
            sx={{ height: 8, borderRadius: 4 }}
          />
          {isPending && (
            <Typography
              variant="caption"
              color="primary"
              sx={{ mt: 1, display: 'block' }}
            >
              Initializing agent on server...
            </Typography>
          )}
        </Box>
      </Paper>

      {/* Error Display */}
      {state.error && (
        <Paper
          elevation={1}
          sx={{ p: 2, bgcolor: 'error.light', color: 'error.contrastText' }}
        >
          <Typography variant="body1">Error: {state.error}</Typography>
          <Button
            size="small"
            onClick={() => setState((prev) => ({ ...prev, error: null }))}
            sx={{ mt: 1, color: 'inherit' }}
          >
            Dismiss
          </Button>
        </Paper>
      )}

      <Box sx={{ display: 'flex', gap: 2, flexGrow: 1 }}>
        {/* Left Panel - Controls and Current Status */}
        <Box
          sx={{
            width: '33%',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          {/* Current Document */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Current Document
              </Typography>
              {state.currentDocument ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Description color="primary" />
                  <Typography variant="body1">
                    {state.currentDocument}
                  </Typography>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No document being processed
                </Typography>
              )}
            </CardContent>
          </Card>

          {/* Controls */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Controls
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Button
                  variant="contained"
                  onClick={processNextDocument}
                  disabled={
                    !hasMoreDocuments ||
                    state.isProcessing ||
                    !state.isInitialized ||
                    isPending
                  }
                  startIcon={
                    state.isProcessing ? (
                      <CircularProgress size={20} />
                    ) : (
                      <PlayArrow />
                    )
                  }
                  fullWidth
                >
                  {state.isProcessing
                    ? 'Processing...'
                    : 'Process Next Document'}
                </Button>

                <Button
                  variant="outlined"
                  onClick={initializeAgent}
                  disabled={state.isProcessing || isPending}
                  startIcon={
                    isPending ? <CircularProgress size={20} /> : <Refresh />
                  }
                  fullWidth
                >
                  {isPending ? 'Initializing...' : 'Reinitialize Agent'}
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* Document Queue */}
          <Card sx={{ flexGrow: 1 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Document Queue
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <Chip
                  label={`${documentCounts.pending} Pending`}
                  color="warning"
                  size="small"
                />
                <Chip
                  label={`${documentCounts.processed} Processed`}
                  color="success"
                  size="small"
                />
              </Box>
              {!hasMoreDocuments && documentCounts.total > 0 && (
                <Paper
                  elevation={1}
                  sx={{
                    p: 1,
                    bgcolor: 'success.light',
                    color: 'success.contrastText',
                  }}
                >
                  <Typography variant="body2">
                    All documents have been processed!
                  </Typography>
                </Paper>
              )}
            </CardContent>
          </Card>
        </Box>

        {/* Right Panel - Timeline Summary */}
        <Box sx={{ width: '67%' }}>
          <Card sx={{ height: '100%' }}>
            <CardContent
              sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}
            >
              <Typography variant="h6" gutterBottom>
                Timeline Summary
              </Typography>

              {state.summary ? (
                <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                  {/* Global Metadata */}
                  <Accordion defaultExpanded>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Typography variant="subtitle1">Case Overview</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        <Box sx={{ minWidth: '45%' }}>
                          <Typography variant="body2" color="text.secondary">
                            Case Type
                          </Typography>
                          <Typography variant="body1">
                            {state.summary.globalMetadata.caseType}
                          </Typography>
                        </Box>
                        <Box sx={{ minWidth: '45%' }}>
                          <Typography variant="body2" color="text.secondary">
                            Request Type
                          </Typography>
                          <Typography variant="body1">
                            {state.summary.globalMetadata.requestType}
                          </Typography>
                        </Box>
                        <Box sx={{ minWidth: '45%' }}>
                          <Typography variant="body2" color="text.secondary">
                            Requester
                          </Typography>
                          <Typography variant="body1">
                            {state.summary.globalMetadata.requesterName ||
                              'N/A'}
                          </Typography>
                        </Box>
                        <Box sx={{ minWidth: '45%' }}>
                          <Typography variant="body2" color="text.secondary">
                            Status
                          </Typography>
                          <Typography variant="body1">
                            {state.summary.globalMetadata.currentStatus}
                          </Typography>
                        </Box>
                      </Box>
                    </AccordionDetails>
                  </Accordion>

                  {/* Compliance Ratings */}
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Typography variant="subtitle1">
                        Compliance Ratings
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <List dense>
                        {Object.entries(state.summary.complianceRatings).map(
                          ([key, rating]) => (
                            <ListItem key={key}>
                              <ListItemIcon>
                                {getComplianceIcon(rating)}
                              </ListItemIcon>
                              <ListItemText
                                primary={
                                  key.charAt(0).toUpperCase() + key.slice(1)
                                }
                                secondary={rating}
                              />
                            </ListItem>
                          ),
                        )}
                      </List>
                    </AccordionDetails>
                  </Accordion>

                  {/* Sequential Actions */}
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Typography variant="subtitle1">
                        Timeline Actions (
                        {state.summary.sequentialActions.length})
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <List>
                        {state.summary.sequentialActions.map(
                          (action, index) => (
                            <React.Fragment key={action.documentId}>
                              <ListItem>
                                <ListItemText
                                  primary={`${index + 1}. ${action.summary}`}
                                  secondary={
                                    <Box>
                                      <Typography
                                        variant="caption"
                                        display="block"
                                      >
                                        Document: {action.documentId}
                                      </Typography>
                                      <Typography
                                        variant="caption"
                                        display="block"
                                      >
                                        Date:{' '}
                                        {new Date(action.date).toLocaleString()}
                                      </Typography>
                                      {action.verbatimStatements &&
                                        action.verbatimStatements.length >
                                          0 && (
                                          <Box sx={{ mt: 1 }}>
                                            <Typography
                                              variant="caption"
                                              color="primary"
                                            >
                                              Key Statements:
                                            </Typography>
                                            {action.verbatimStatements.map(
                                              (statement, idx) => (
                                                <Typography
                                                  key={idx}
                                                  variant="caption"
                                                  display="block"
                                                  sx={{
                                                    fontStyle: 'italic',
                                                    ml: 1,
                                                  }}
                                                >
                                                  &ldquo;{statement}&rdquo;
                                                </Typography>
                                              ),
                                            )}
                                          </Box>
                                        )}
                                    </Box>
                                  }
                                />
                              </ListItem>
                              {index <
                                state.summary!.sequentialActions.length - 1 && (
                                <Divider />
                              )}
                            </React.Fragment>
                          ),
                        )}
                      </List>
                    </AccordionDetails>
                  </Accordion>

                  {/* Critical Issues */}
                  {state.summary.criticalIssues.length > 0 && (
                    <Accordion>
                      <AccordionSummary expandIcon={<ExpandMore />}>
                        <Typography variant="subtitle1">
                          Critical Issues ({state.summary.criticalIssues.length}
                          )
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <List>
                          {state.summary.criticalIssues.map((issue, index) => (
                            <ListItem key={index}>
                              <ListItemIcon>
                                <Warning color="error" />
                              </ListItemIcon>
                              <ListItemText primary={issue} />
                            </ListItem>
                          ))}
                        </List>
                      </AccordionDetails>
                    </Accordion>
                  )}

                  {/* Last Processing Result */}
                  {state.lastResult && (
                    <Accordion>
                      <AccordionSummary expandIcon={<ExpandMore />}>
                        <Typography variant="subtitle1">
                          Last Processing Result
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Typography variant="body2" gutterBottom>
                          Document: {state.lastResult.documentId}
                        </Typography>
                        {state.lastResult.notes &&
                          state.lastResult.notes.length > 0 && (
                            <Box sx={{ mt: 1 }}>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                gutterBottom
                              >
                                Processing Notes:
                              </Typography>
                              <List dense>
                                {state.lastResult.notes.map((note, index) => (
                                  <ListItem key={index}>
                                    <ListItemText primary={note} />
                                  </ListItem>
                                ))}
                              </List>
                            </Box>
                          )}
                      </AccordionDetails>
                    </Accordion>
                  )}
                </Box>
              ) : (
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    flexGrow: 1,
                    flexDirection: 'column',
                    gap: 2,
                  }}
                >
                  {state.isProcessing || isPending ? (
                    <>
                      <CircularProgress />
                      <Typography variant="body2" color="text.secondary">
                        {isPending
                          ? 'Initializing agent on server...'
                          : 'Processing document...'}
                      </Typography>
                    </>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Initialize agent to view timeline summary
                    </Typography>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
};
