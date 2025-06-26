'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Divider,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  Stack,
  LinearProgress,
} from '@mui/material';
import {
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Subject as SubjectIcon,
  Email as EmailIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { EmailMessage, EmailMessageSummary } from '@/data-models/api/email-message';
import {
  KeyPointsDetails,
  CallToActionDetails,
  CallToActionResponseDetails,
  EmailSentimentAnalysisDetails,
  EmailProperty,
} from '@/data-models/api';
import { getEmail } from '@/lib/api/client';
import { 
  getKeyPoints, 
  getCallToAction, 
  getCallToActionResponse,
  getSentimentAnalysis,
  getNotes
} from '@/lib/api/email/properties/client';
import { log } from '@/lib/logger';
import { isError, LoggedError } from '@/lib/react-util';
import { AbortablePromise, ICancellablePromiseExt } from '@/lib/typescript';

interface EmailDetailPanelProps {
  row: EmailMessageSummary;
}

interface EmailProperties {
  keyPoints: KeyPointsDetails[];
  callToActions: CallToActionDetails[];
  callToActionResponses: CallToActionResponseDetails[];
  notes: EmailProperty[];
  sentimentAnalysis: EmailSentimentAnalysisDetails[];
}

const EmailDetailPanel: React.FC<EmailDetailPanelProps> = ({ row }) => {
  const [email, setEmail] = useState<EmailMessage | null>(null);
  const [properties, setProperties] = useState<EmailProperties>({
    keyPoints: [],
    callToActions: [],
    callToActionResponses: [],
    notes: [],
    sentimentAnalysis: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [propertiesLoading, setPropertiesLoading] = useState<{[key: string]: boolean}>({});

  // Fetch email data when panel is opened
  useEffect(() => {
    let cancelled = false;
    let request: ICancellablePromiseExt<EmailMessage | void> | null = null;

    if (row.emailId && !email) {
      setLoading(true);
      setError('');
      
      request = getEmail(row.emailId)
        .then((data) => {
          if (!cancelled) {
            setEmail(data);
          }
          return data;
        })
        .catch((error) => {
          if (cancelled || AbortablePromise.isOperationCancelledError(error)) {
            return;
          }
          LoggedError.isTurtlesAllTheWayDownBaby(error, {
            log: true,
            source: 'email-detail-panel: load email',
          });
          setError(
            String(
              isError(error) ? error.message : 'Error fetching email details.',
            ),
          );
        })
        .finally(() => {
          request = null;
          if (!cancelled) {
            setLoading(false);
          }
        });

      return () => {
        cancelled = true;
        request?.cancel();
      };
    }
  }, [row.emailId, email]);

  // Function to load email properties lazily
  const loadProperties = async (propertyType: keyof EmailProperties) => {
    if (!row.emailId || properties[propertyType].length > 0 || propertiesLoading[propertyType]) {
      return;
    }

    setPropertiesLoading(prev => ({ ...prev, [propertyType]: true }));

    try {
      let result;
      switch (propertyType) {
        case 'keyPoints':
          result = await getKeyPoints({ emailId: row.emailId, page: 1, num: 100 });
          break;
        case 'callToActions':
          result = await getCallToAction({ emailId: row.emailId, page: 1, num: 100 });
          break;
        case 'callToActionResponses':
          result = await getCallToActionResponse({ emailId: row.emailId, page: 1, num: 100 });
          break;
        case 'sentimentAnalysis':
          result = await getSentimentAnalysis({ emailId: row.emailId, page: 1, num: 100 });
          break;
        case 'notes':
          result = await getNotes({ emailId: row.emailId, page: 1, num: 100 });
          break;
        default:
          return;
      }

      setProperties(prev => ({
        ...prev,
        [propertyType]: result.results || []
      }));
    } catch (error) {
      log((l) => l.error({
        message: `Error fetching ${propertyType}`,
        data: { emailId: row.emailId, error: String(error) }
      }));
    } finally {
      setPropertiesLoading(prev => ({ ...prev, [propertyType]: false }));
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Loading Email Details...
        </Typography>
        <LinearProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!email) {
    // Show basic summary info if we don't have full email data
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Email Summary
        </Typography>
        
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonIcon color="action" />
            <Typography variant="body2">
              <strong>From:</strong> {row.sender?.name || 'Unknown'} ({row.sender?.email || 'N/A'})
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SubjectIcon color="action" />
            <Typography variant="body2">
              <strong>Subject:</strong> {row.subject || 'No subject'}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ScheduleIcon color="action" />
            <Typography variant="body2">
              <strong>Sent:</strong> {row.sentOn ? new Date(row.sentOn).toLocaleString() : 'Unknown'}
            </Typography>
          </Box>

          {/* Stats */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {row.count_attachments > 0 && (
              <Chip label={`${row.count_attachments} Attachments`} size="small" variant="outlined" />
            )}
            {row.count_kpi > 0 && (
              <Chip label={`${row.count_kpi} Key Points`} size="small" variant="outlined" />
            )}
            {row.count_notes > 0 && (
              <Chip label={`${row.count_notes} Notes`} size="small" variant="outlined" />
            )}
            {(row.count_cta + (row.count_responsive_actions || 0)) > 0 && (
              <Chip 
                label={`${row.count_cta + (row.count_responsive_actions || 0)} CTAs`} 
                size="small" 
                variant="outlined" 
              />
            )}
          </Box>
        </Stack>

        {/* Expandable Sections for Properties */}
        <Box sx={{ mt: 3 }}>
          {/* Key Points Section */}
          {row.count_kpi > 0 && (
            <Accordion>
              <AccordionSummary 
                expandIcon={<ExpandMoreIcon />}
                onClick={() => loadProperties('keyPoints')}
              >
                <Typography variant="h6">
                  Key Points ({row.count_kpi})
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                {propertiesLoading.keyPoints ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : properties.keyPoints.length > 0 ? (
                  <Stack spacing={1}>
                    {properties.keyPoints.map((kp, index) => (
                      <Box key={kp.propertyId || index} sx={{ p: 1, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                        <Typography variant="body2">{kp.value || kp.description}</Typography>
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="textSecondary">
                    No key points available.
                  </Typography>
                )}
              </AccordionDetails>
            </Accordion>
          )}

          {/* Call to Actions Section */}
          {row.count_cta > 0 && (
            <Accordion>
              <AccordionSummary 
                expandIcon={<ExpandMoreIcon />}
                onClick={() => loadProperties('callToActions')}
              >
                <Typography variant="h6">
                  Call to Actions ({row.count_cta})
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                {propertiesLoading.callToActions ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : properties.callToActions.length > 0 ? (
                  <Stack spacing={1}>
                    {properties.callToActions.map((cta, index) => (
                      <Box key={cta.propertyId || index} sx={{ p: 1, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                        <Typography variant="body2">{cta.value}</Typography>
                        {cta.completion_percentage !== undefined && (
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="caption">
                              {cta.completion_percentage}% Complete
                            </Typography>
                            <LinearProgress 
                              variant="determinate" 
                              value={cta.completion_percentage} 
                              sx={{ height: 4, borderRadius: 1 }} 
                            />
                          </Box>
                        )}
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="textSecondary">
                    No call to actions available.
                  </Typography>
                )}
              </AccordionDetails>
            </Accordion>
          )}

          {/* CTA Responses Section */}
          {(row.count_responsive_actions || 0) > 0 && (
            <Accordion>
              <AccordionSummary 
                expandIcon={<ExpandMoreIcon />}
                onClick={() => loadProperties('callToActionResponses')}
              >
                <Typography variant="h6">
                  CTA Responses ({row.count_responsive_actions})
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                {propertiesLoading.callToActionResponses ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : properties.callToActionResponses.length > 0 ? (
                  <Stack spacing={1}>
                    {properties.callToActionResponses.map((response, index) => (
                      <Box key={response.propertyId || index} sx={{ p: 1, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                        <Typography variant="body2">{response.value}</Typography>
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="textSecondary">
                    No CTA responses available.
                  </Typography>
                )}
              </AccordionDetails>
            </Accordion>
          )}

          {/* Notes Section */}
          {row.count_notes > 0 && (
            <Accordion>
              <AccordionSummary 
                expandIcon={<ExpandMoreIcon />}
                onClick={() => loadProperties('notes')}
              >
                <Typography variant="h6">
                  Notes ({row.count_notes})
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                {propertiesLoading.notes ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : properties.notes.length > 0 ? (
                  <Stack spacing={1}>
                    {properties.notes.map((note, index) => (
                      <Box key={note.propertyId || index} sx={{ p: 1, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                        <Typography variant="body2">{note.value}</Typography>
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="textSecondary">
                    No notes available.
                  </Typography>
                )}
              </AccordionDetails>
            </Accordion>
          )}
        </Box>
      </Box>
    );
  }

  // Full email details if we have email data
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Email Details
      </Typography>

      <Stack spacing={2}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonIcon color="action" />
          <Typography variant="body1">
            <strong>From:</strong> {email.sender?.name} ({email.sender?.email})
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <EmailIcon color="action" />
          <Typography variant="body1" sx={{ mr: 1 }}>
            <strong>To:</strong>
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {email.recipients?.map((recipient, index) => (
              <Chip
                key={`recipient-${recipient.contactId}-${index}`}
                label={`${recipient.name} (${recipient.email})`}
                variant="outlined"
                size="small"
              />
            )) || []}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SubjectIcon color="action" />
          <Typography variant="body1">
            <strong>Subject:</strong> {email.subject}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ScheduleIcon color="action" />
          <Typography variant="body1">
            <strong>Sent:</strong> {new Date(email.sentOn).toLocaleString()}
          </Typography>
        </Box>

        {email.body && (
          <>
            <Divider />
            <Box>
              <Typography variant="h6" gutterBottom>
                Email Content
              </Typography>
              <Card variant="outlined">
                <CardContent>
                  <Typography 
                    variant="body2" 
                    component="pre" 
                    sx={{ 
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      fontFamily: 'inherit'
                    }}
                  >
                    {email.body}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          </>
        )}
      </Stack>

      {/* Same expandable sections as above for properties */}
      <Box sx={{ mt: 3 }}>
        {/* Include same expandable sections here if needed */}
      </Box>
    </Box>
  );
};

export default EmailDetailPanel;