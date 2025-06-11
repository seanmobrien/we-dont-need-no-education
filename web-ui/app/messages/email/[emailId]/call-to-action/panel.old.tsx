import React, { useState, useEffect } from 'react';
import { 
  Stack, 
  Paper, 
  Typography, 
  Chip, 
  Box, 
  Grid,
  Divider,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Link,
  Alert,
  CircularProgress
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { CallToActionDetails, CallToActionResponseDetails } from '@/data-models/api';
import { getCallToActionResponse } from '@/lib/api/email/properties/client';
import { useParams } from 'next/navigation';
import { EmailMasterPanel } from '@/components/mui/data-grid';

const formatDate = (date: Date | null): string => {
  if (!date) return 'Not set';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

const formatPercentage = (value: number | null): string => {
  if (value === null || value === undefined) return 'N/A';
  return `${Math.round(value)}%`;
};

const formatScore = (value: number | null): string => {
  if (value === null || value === undefined) return 'N/A';
  return value.toFixed(2);
};

export const CallToActionPanel = ({ row }: { row: CallToActionDetails }) => {
  const { emailId } = useParams();
  const [relatedResponses, setRelatedResponses] = useState<CallToActionResponseDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRelatedResponses = async () => {
      try {
        setLoading(true);
        const result = await getCallToActionResponse({ 
          emailId: emailId as string,
          page: 1,
          num: 100 // Get all related responses
        });
        
        // Filter responses that are related to this CTA
        const filtered = result.results.filter(response => 
          response.actionPropertyId === row.propertyId
        );
        setRelatedResponses(filtered);
      } catch (err) {
        setError('Failed to load related responses');
        console.error('Error fetching related responses:', err);
      } finally {
        setLoading(false);
      }
    };

    if (row.propertyId && emailId) {
      fetchRelatedResponses();
    }
  }, [row.propertyId, emailId]);

  return (
    <Stack sx={{ py: 2, height: '100%', boxSizing: 'border-box' }} direction="column">
      <Paper sx={{ flex: 1, mx: 'auto', width: '95%', p: 2 }}>
        <Stack direction="column" spacing={2}>
          {/* Header */}
          <Typography variant="h5" component="h2" gutterBottom>
            Call to Action Details
          </Typography>
          
          {/* Description */}
          <Box>
            <Typography variant="h6" gutterBottom>Description</Typography>
            <Typography variant="body1" sx={{ backgroundColor: 'grey.100', p: 2, borderRadius: 1 }}>
              {row.value}
            </Typography>
          </Box>

          {/* Progress and Status */}
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>Completion Progress</Typography>
              <Box sx={{ mb: 1 }}>
                <Typography variant="body2" color="textSecondary">
                  {formatPercentage(row.completion_percentage)} Complete
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={row.completion_percentage || 0} 
                sx={{ height: 8, borderRadius: 1 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>Status Indicators</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip 
                  label={row.inferred ? "Inferred" : "Direct"} 
                  color={row.inferred ? "secondary" : "primary"}
                  size="small"
                />
                <Chip 
                  label={row.compliance_date_enforceable ? "Enforceable" : "Not Enforceable"} 
                  color={row.compliance_date_enforceable ? "warning" : "default"}
                  size="small"
                />
              </Stack>
            </Grid>
          </Grid>

          {/* Dates */}
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle1" fontWeight="bold">Opened Date</Typography>
              <Typography variant="body2">{formatDate(row.opened_date)}</Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle1" fontWeight="bold">Closed Date</Typography>
              <Typography variant="body2">{formatDate(row.closed_date)}</Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle1" fontWeight="bold">Compliance Due</Typography>
              <Typography variant="body2">{formatDate(row.compliancy_close_date)}</Typography>
            </Grid>
          </Grid>

          {/* Ratings and Scores */}
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <Typography variant="subtitle1" fontWeight="bold">Compliance Rating</Typography>
              <Typography variant="body2">{formatScore(row.compliance_rating)}</Typography>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="subtitle1" fontWeight="bold">Severity</Typography>
              <Typography variant="body2">{formatScore(row.severity)}</Typography>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="subtitle1" fontWeight="bold">Sentiment</Typography>
              <Typography variant="body2">{formatScore(row.sentiment)}</Typography>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="subtitle1" fontWeight="bold">Title IX Applicable</Typography>
              <Typography variant="body2">{formatScore(row.title_ix_applicable)}</Typography>
            </Grid>
          </Grid>

          <Divider />

          {/* Expandable Sections */}
          <Stack spacing={1}>
            {/* Reasons and Explanations */}
            {(row.compliance_rating_reasons?.length || 
              row.sentiment_reasons?.length || 
              row.title_ix_applicable_reasons?.length || 
              row.severity_reason?.length) && (
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">Reasoning and Analysis</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={2}>
                    {row.compliance_rating_reasons?.length && (
                      <Box>
                        <Typography variant="subtitle1" fontWeight="bold">Compliance Rating Reasons</Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          {row.compliance_rating_reasons.map((reason, index) => (
                            <Chip key={index} label={reason} variant="outlined" size="small" />
                          ))}
                        </Stack>
                      </Box>
                    )}
                    {row.sentiment_reasons?.length && (
                      <Box>
                        <Typography variant="subtitle1" fontWeight="bold">Sentiment Reasons</Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          {row.sentiment_reasons.map((reason, index) => (
                            <Chip key={index} label={reason} variant="outlined" size="small" />
                          ))}
                        </Stack>
                      </Box>
                    )}
                    {row.title_ix_applicable_reasons?.length && (
                      <Box>
                        <Typography variant="subtitle1" fontWeight="bold">Title IX Reasons</Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          {row.title_ix_applicable_reasons.map((reason, index) => (
                            <Chip key={index} label={reason} variant="outlined" size="small" />
                          ))}
                        </Stack>
                      </Box>
                    )}
                    {row.severity_reason?.length && (
                      <Box>
                        <Typography variant="subtitle1" fontWeight="bold">Severity Reasons</Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                          {row.severity_reason.map((reason, index) => (
                            <Chip key={index} label={reason} variant="outlined" size="small" />
                          ))}
                        </Stack>
                      </Box>
                    )}
                  </Stack>
                </AccordionDetails>
              </Accordion>
            )}

            {/* Closure Actions */}
            {row.closure_actions?.length && (
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">Closure Actions</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={1}>
                    {row.closure_actions.map((action, index) => (
                      <Chip key={index} label={action} variant="outlined" />
                    ))}
                  </Stack>
                </AccordionDetails>
              </Accordion>
            )}

            {/* Related Responsive Actions */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">
                  Related Responsive Actions ({relatedResponses.length})
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                {loading ? (
                  <Box display="flex" justifyContent="center" p={2}>
                    <CircularProgress size={24} />
                  </Box>
                ) : error ? (
                  <Alert severity="error">{error}</Alert>
                ) : relatedResponses.length === 0 ? (
                  <Typography variant="body2" color="textSecondary">
                    No responsive actions found for this call-to-action.
                  </Typography>
                ) : (
                  <Stack spacing={2}>
                    {relatedResponses.map((response, index) => (
                      <Paper key={response.propertyId} variant="outlined" sx={{ p: 2 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                          <Box flex={1}>
                            <Typography variant="subtitle1" fontWeight="bold">
                              Response {index + 1}
                            </Typography>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                              {response.value}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              Completed: {formatPercentage(response.completionPercentage)} • 
                              Timestamp: {formatDate(response.responseTimestamp)}
                            </Typography>
                          </Box>
                          <Link
                            href={`/messages/email/${emailId}/call-to-action-response?highlight=${response.propertyId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ ml: 2 }}
                          >
                            <OpenInNewIcon fontSize="small" />
                          </Link>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                )}
              </AccordionDetails>
            </Accordion>

            {/* Policy Basis and Tags */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">Metadata</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={2}>
                  {/* Additional metadata can be added here if needed */}
                </Stack>
              </AccordionDetails>
            </Accordion>
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  );
};
