import React, { useState, useEffect } from 'react';
import { 
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
  CircularProgress,
  Stack,
  Paper
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { CallToActionResponseDetails, CallToActionDetails } from '@/data-models/api';
import { getCallToAction } from '@/lib/api/email/properties/client';
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

const ResponsiveActionPanelContent = ({ row }: { row: CallToActionResponseDetails }) => {
  const { emailId } = useParams();
  const [relatedCTA, setRelatedCTA] = useState<CallToActionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRelatedCTA = async () => {
      try {
        setLoading(true);
        const result = await getCallToAction({ 
          emailId: emailId as string,
          page: 1,
          num: 100 // Get all CTAs
        });
        
        // Find the CTA that this response is related to
        const relatedCta = result.results.find(cta => 
          cta.propertyId === row.actionPropertyId
        );
        setRelatedCTA(relatedCta || null);
      } catch (err) {
        setError('Failed to load related call-to-action');
        console.error('Error fetching related CTA:', err);
      } finally {
        setLoading(false);
      }
    };

    if (row.actionPropertyId && emailId) {
      fetchRelatedCTA();
    }
  }, [row.actionPropertyId, emailId]);

  return (
    <>
      {/* Progress and Timing */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom>Completion Progress</Typography>
          <Box sx={{ mb: 1 }}>
            <Typography variant="body2" color="textSecondary">
              {formatPercentage(row.completionPercentage)} Complete
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={row.completionPercentage || 0} 
            sx={{ height: 8, borderRadius: 1 }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom>Response Timing</Typography>
          <Typography variant="body1" fontWeight="bold">
            {formatDate(row.responseTimestamp)}
          </Typography>
        </Grid>
      </Grid>

      {/* Status Indicators */}
      <Box>
        <Typography variant="h6" gutterBottom>Status</Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          {row.inferred !== undefined && (
            <Chip 
              label={row.inferred ? "Inferred" : "Direct"} 
              color={row.inferred ? "secondary" : "primary"}
              size="small"
            />
          )}
        </Stack>
      </Box>

      {/* Scores and Ratings */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Typography variant="subtitle1" fontWeight="bold">Severity Score</Typography>
          <Typography variant="body2">{formatScore(row.severity)}</Typography>
        </Grid>
        <Grid item xs={12} md={4}>
          <Typography variant="subtitle1" fontWeight="bold">Sentiment Score</Typography>
          <Typography variant="body2">{formatScore(row.sentiment)}</Typography>
        </Grid>
        <Grid item xs={12} md={4}>
          <Typography variant="subtitle1" fontWeight="bold">Chapter 13 Compliance</Typography>
          <Typography variant="body2">{formatScore(row.compliance_average_chapter_13)}</Typography>
        </Grid>
      </Grid>

      <Divider />

      {/* Expandable Sections */}
      <Stack spacing={1}>
        {/* Reasons and Analysis */}
        {(row.severity_reasons?.length || 
          row.sentiment_reasons?.length || 
          row.compliance_chapter_13_reasons?.length) && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Analysis and Reasoning</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                {row.severity_reasons?.length && (
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold">Severity Reasons</Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      {row.severity_reasons.map((reason, index) => (
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
                {row.compliance_chapter_13_reasons?.length && (
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold">Chapter 13 Compliance Reasons</Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      {row.compliance_chapter_13_reasons.map((reason, index) => (
                        <Chip key={index} label={reason} variant="outlined" size="small" />
                      ))}
                    </Stack>
                  </Box>
                )}
              </Stack>
            </AccordionDetails>
          </Accordion>
        )}

        {/* Related Call-to-Action */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">
              Related Call-to-Action
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            {loading ? (
              <Box display="flex" justifyContent="center" p={2}>
                <CircularProgress size={24} />
              </Box>
            ) : error ? (
              <Alert severity="error">{error}</Alert>
            ) : !relatedCTA ? (
              <Typography variant="body2" color="textSecondary">
                No related call-to-action found.
              </Typography>
            ) : (
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box flex={1}>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      Call-to-Action Details
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      {relatedCTA.value}
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="textSecondary">
                          Completion: {formatPercentage(relatedCTA.completion_percentage)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="textSecondary">
                          Status: {relatedCTA.inferred ? 'Inferred' : 'Direct'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="textSecondary">
                          Opened: {formatDate(relatedCTA.opened_date)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="textSecondary">
                          Due: {formatDate(relatedCTA.compliancy_close_date)}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>
                  <Link
                    href={`/messages/email/${emailId}/call-to-action?highlight=${relatedCTA.propertyId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ ml: 2 }}
                  >
                    <OpenInNewIcon fontSize="small" />
                  </Link>
                </Stack>
              </Paper>
            )}
          </AccordionDetails>
        </Accordion>
      </Stack>
    </>
  );
};

export const ResponsiveActionPanel = ({ row }: { row: CallToActionResponseDetails }) => {
  return (
    <EmailMasterPanel title="Responsive Action" row={row}>
      <ResponsiveActionPanelContent row={row} />
    </EmailMasterPanel>
  );
};

export default ResponsiveActionPanel;
