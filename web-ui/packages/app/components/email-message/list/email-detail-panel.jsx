'use client';
import React, { useState } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import LinearProgress from '@mui/material/LinearProgress';
import PersonIcon from '@mui/icons-material/Person';
import ScheduleIcon from '@mui/icons-material/Schedule';
import SubjectIcon from '@mui/icons-material/Subject';
import EmailIcon from '@mui/icons-material/Email';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { getEmail } from '@/lib/api/client';
import { getKeyPoints, getCallToAction, getCallToActionResponse, getNotes, } from '@/lib/api/email/properties/client';
import { LoggedError } from '@compliance-theater/logger';
import { useQuery } from '@tanstack/react-query';
import { dataGridQueryClient } from '@/lib/components/mui/data-grid/query-client';
const createEmailQueryKey = (emailId) => ['email', emailId];
const createEmailPropertiesQueryKey = (emailId, propertyType) => ['email', emailId, 'properties', propertyType];
const useEmail = (emailId) => {
    return useQuery({
        queryKey: createEmailQueryKey(emailId),
        queryFn: async () => {
            const result = await getEmail(emailId);
            return result;
        },
        enabled: !!emailId,
        staleTime: 30 * 1000,
        gcTime: 5 * 60 * 1000,
        retry: (failureCount, error) => {
            if (error instanceof Error && 'status' in error) {
                const status = error.status;
                if (status >= 400 && status < 500) {
                    return false;
                }
            }
            return failureCount < 3;
        },
    }, dataGridQueryClient);
};
const useEmailProperties = (emailId, propertyType, enabled = false) => {
    return useQuery({
        queryKey: createEmailPropertiesQueryKey(emailId, propertyType),
        queryFn: async () => {
            let result;
            switch (propertyType) {
                case 'keyPoints':
                    result = await getKeyPoints({ emailId, page: 1, num: 100 });
                    break;
                case 'callToActions':
                    result = await getCallToAction({ emailId, page: 1, num: 100 });
                    break;
                case 'callToActionResponses':
                    result = await getCallToActionResponse({
                        emailId,
                        page: 1,
                        num: 100,
                    });
                    break;
                case 'notes':
                    result = await getNotes({ emailId, page: 1, num: 100 });
                    break;
                default:
                    throw new Error(`Unknown property type: ${propertyType}`);
            }
            return result.results || [];
        },
        enabled: !!emailId && enabled,
        staleTime: 30 * 1000,
        gcTime: 5 * 60 * 1000,
        retry: (failureCount, error) => {
            if (error instanceof Error && 'status' in error) {
                const status = error.status;
                if (status >= 400 && status < 500) {
                    return false;
                }
            }
            const willRetry = failureCount < 3;
            if (!willRetry) {
                LoggedError.isTurtlesAllTheWayDownBaby(error, {
                    log: true,
                    source: `email-detail-panel: load ${propertyType}`,
                });
            }
            return willRetry;
        },
    }, dataGridQueryClient);
};
const EmailDetailPanel = ({ row }) => {
    const [expandedSections, setExpandedSections] = useState(new Set());
    const { data: email, isLoading: emailLoading, error: emailError, } = useEmail(row.emailId);
    const { data: keyPoints = [], isLoading: keyPointsLoading } = useEmailProperties(row.emailId, 'keyPoints', expandedSections.has('keyPoints'));
    const { data: callToActions = [], isLoading: callToActionsLoading } = useEmailProperties(row.emailId, 'callToActions', expandedSections.has('callToActions'));
    const { data: callToActionResponses = [], isLoading: callToActionResponsesLoading, } = useEmailProperties(row.emailId, 'callToActionResponses', expandedSections.has('callToActionResponses'));
    const { data: notes = [], isLoading: notesLoading } = useEmailProperties(row.emailId, 'notes', expandedSections.has('notes'));
    const handleAccordionChange = (propertyType) => {
        setExpandedSections((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(propertyType)) {
                newSet.delete(propertyType);
            }
            else {
                newSet.add(propertyType);
            }
            return newSet;
        });
    };
    if (emailLoading) {
        return (<Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Loading Email Details...
        </Typography>
        <LinearProgress />
      </Box>);
    }
    if (emailError) {
        const errorMessage = LoggedError.isTurtlesAllTheWayDownBaby(emailError, {
            log: true,
            source: 'email-detail-panel: load email',
        }).message;
        return (<Box sx={{ p: 2 }}>
        <Alert severity="error">{errorMessage}</Alert>
      </Box>);
    }
    if (!email) {
        return (<Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Email Summary
        </Typography>

        <Stack spacing={2}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonIcon color="action"/>
            <Typography variant="body2">
              <strong>From:</strong> {row.sender?.name || 'Unknown'} (
              {row.sender?.email || 'N/A'})
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SubjectIcon color="action"/>
            <Typography variant="body2">
              <strong>Subject:</strong> {row.subject || 'No subject'}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ScheduleIcon color="action"/>
            <Typography variant="body2">
              <strong>Sent:</strong>{' '}
              {row.sentOn ? new Date(row.sentOn).toLocaleString() : 'Unknown'}
            </Typography>
          </Box>

          
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {(row.count_attachments ?? 0) > 0 && (<Chip label={`${row.count_attachments} Attachments`} size="small" variant="outlined"/>)}
            {(row.count_kpi ?? 0) > 0 && (<Chip label={`${row.count_kpi} Key Points`} size="small" variant="outlined"/>)}
            {(row.count_notes ?? 0) > 0 && (<Chip label={`${row.count_notes} Notes`} size="small" variant="outlined"/>)}
            {(row.count_cta ?? 0) + (row.count_responsive_actions ?? 0) > 0 && (<Chip label={`${(row.count_cta ?? 0) + (row.count_responsive_actions ?? 0)} CTAs`} size="small" variant="outlined"/>)}
          </Box>
        </Stack>

        
        <Box sx={{ mt: 3 }}>
          
          {(row.count_kpi ?? 0) > 0 && (<Accordion expanded={expandedSections.has('keyPoints')} onChange={() => handleAccordionChange('keyPoints')}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">
                  Key Points ({row.count_kpi})
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                {keyPointsLoading ? (<Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                    <CircularProgress size={24}/>
                  </Box>) : keyPoints.length > 0 ? (<Stack spacing={1}>
                    {keyPoints.map((kp, index) => (<Box key={kp.propertyId || index} sx={{
                            p: 1,
                            border: '1px solid #e0e0e0',
                            borderRadius: 1,
                        }}>
                        <Typography variant="body2">{kp.value}</Typography>
                      </Box>))}
                  </Stack>) : (<Typography variant="body2" color="textSecondary">
                    No key points available.
                  </Typography>)}
              </AccordionDetails>
            </Accordion>)}

          
          {(row.count_cta ?? 0) > 0 && (<Accordion expanded={expandedSections.has('callToActions')} onChange={() => handleAccordionChange('callToActions')}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">
                  Call to Actions ({row.count_cta})
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                {callToActionsLoading ? (<Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                    <CircularProgress size={24}/>
                  </Box>) : callToActions.length > 0 ? (<Stack spacing={1}>
                    {callToActions.map((cta, index) => (<Box key={cta.propertyId || index} sx={{
                            p: 1,
                            border: '1px solid #e0e0e0',
                            borderRadius: 1,
                        }}>
                          <Typography variant="body2">{cta.value}</Typography>
                          {cta.completion_percentage !== undefined && (<Box sx={{ mt: 1 }}>
                              <Typography variant="caption">
                                {cta.completion_percentage}% Complete
                              </Typography>
                              <LinearProgress variant="determinate" value={cta.completion_percentage} sx={{ height: 4, borderRadius: 1 }}/>
                            </Box>)}
                        </Box>))}
                  </Stack>) : (<Typography variant="body2" color="textSecondary">
                    No call to actions available.
                  </Typography>)}
              </AccordionDetails>
            </Accordion>)}

          
          {(row.count_responsive_actions || 0) > 0 && (<Accordion expanded={expandedSections.has('callToActionResponses')} onChange={() => handleAccordionChange('callToActionResponses')}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">
                  CTA Responses ({row.count_responsive_actions})
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                {callToActionResponsesLoading ? (<Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                    <CircularProgress size={24}/>
                  </Box>) : callToActionResponses.length > 0 ? (<Stack spacing={1}>
                    {callToActionResponses.map((response, index) => (<Box key={response.propertyId || index} sx={{
                            p: 1,
                            border: '1px solid #e0e0e0',
                            borderRadius: 1,
                        }}>
                        <Typography variant="body2">
                          {response.value}
                        </Typography>
                      </Box>))}
                  </Stack>) : (<Typography variant="body2" color="textSecondary">
                    No CTA responses available.
                  </Typography>)}
              </AccordionDetails>
            </Accordion>)}

          
          {(row.count_notes ?? 0) > 0 && (<Accordion expanded={expandedSections.has('notes')} onChange={() => handleAccordionChange('notes')}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">Notes ({row.count_notes})</Typography>
              </AccordionSummary>
              <AccordionDetails>
                {notesLoading ? (<Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                    <CircularProgress size={24}/>
                  </Box>) : notes.length > 0 ? (<Stack spacing={1}>
                    {notes.map((note, index) => (<Box key={note.propertyId || index} sx={{
                            p: 1,
                            border: '1px solid #e0e0e0',
                            borderRadius: 1,
                        }}>
                        <Typography variant="body2">{note.value}</Typography>
                      </Box>))}
                  </Stack>) : (<Typography variant="body2" color="textSecondary">
                    No notes available.
                  </Typography>)}
              </AccordionDetails>
            </Accordion>)}
        </Box>
      </Box>);
    }
    return (<Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Email Details
      </Typography>

      <Stack spacing={2}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonIcon color="action"/>
          <Typography variant="body1">
            <strong>From:</strong> {email.sender?.name} ({email.sender?.email})
          </Typography>
        </Box>

        <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexWrap: 'wrap',
        }}>
          <EmailIcon color="action"/>
          <Typography variant="body1" sx={{ mr: 1 }}>
            <strong>To:</strong>
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {email.recipients?.map((recipient, index) => (<Chip key={`recipient-${recipient.contactId}-${index}`} label={`${recipient.name} (${recipient.email})`} variant="outlined" size="small"/>)) || []}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SubjectIcon color="action"/>
          <Typography variant="body1">
            <strong>Subject:</strong> {email.subject}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ScheduleIcon color="action"/>
          <Typography variant="body1">
            <strong>Sent:</strong> {new Date(email.sentOn).toLocaleString()}
          </Typography>
        </Box>

        {email.body && (<>
            <Divider />
            <Box>
              <Typography variant="h6" gutterBottom>
                Email Content
              </Typography>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="body2" component="pre" sx={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontFamily: 'inherit',
            }}>
                    {email.body}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          </>)}
      </Stack>

      
      <Box sx={{ mt: 3 }}>
        
        {(row.count_kpi ?? 0) > 0 && (<Accordion expanded={expandedSections.has('keyPoints')} onChange={() => handleAccordionChange('keyPoints')}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Key Points ({row.count_kpi})</Typography>
            </AccordionSummary>
            <AccordionDetails>
              {keyPointsLoading ? (<Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={24}/>
                </Box>) : keyPoints.length > 0 ? (<Stack spacing={1}>
                  {keyPoints.map((kp, index) => (<Box key={kp.propertyId || index} sx={{
                        p: 1,
                        border: '1px solid #e0e0e0',
                        borderRadius: 1,
                    }}>
                      <Typography variant="body2">{kp.value}</Typography>
                    </Box>))}
                </Stack>) : (<Typography variant="body2" color="textSecondary">
                  No key points available.
                </Typography>)}
            </AccordionDetails>
          </Accordion>)}

        
        {(row.count_cta ?? 0) > 0 && (<Accordion expanded={expandedSections.has('callToActions')} onChange={() => handleAccordionChange('callToActions')}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">
                Call to Actions ({row.count_cta})
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              {callToActionsLoading ? (<Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={24}/>
                </Box>) : callToActions.length > 0 ? (<Stack spacing={1}>
                  {callToActions.map((cta, index) => (<Box key={cta.propertyId || index} sx={{
                        p: 1,
                        border: '1px solid #e0e0e0',
                        borderRadius: 1,
                    }}>
                        <Typography variant="body2">{cta.value}</Typography>
                        {cta.completion_percentage !== undefined && (<Box sx={{ mt: 1 }}>
                            <Typography variant="caption">
                              {cta.completion_percentage}% Complete
                            </Typography>
                            <LinearProgress variant="determinate" value={cta.completion_percentage} sx={{ height: 4, borderRadius: 1 }}/>
                          </Box>)}
                      </Box>))}
                </Stack>) : (<Typography variant="body2" color="textSecondary">
                  No call to actions available.
                </Typography>)}
            </AccordionDetails>
          </Accordion>)}

        
        {(row.count_responsive_actions || 0) > 0 && (<Accordion expanded={expandedSections.has('callToActionResponses')} onChange={() => handleAccordionChange('callToActionResponses')}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">
                CTA Responses ({row.count_responsive_actions})
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              {callToActionResponsesLoading ? (<Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={24}/>
                </Box>) : callToActionResponses.length > 0 ? (<Stack spacing={1}>
                  {callToActionResponses.map((response, index) => (<Box key={response.propertyId || index} sx={{
                        p: 1,
                        border: '1px solid #e0e0e0',
                        borderRadius: 1,
                    }}>
                        <Typography variant="body2">
                          {response.value}
                        </Typography>
                      </Box>))}
                </Stack>) : (<Typography variant="body2" color="textSecondary">
                  No CTA responses available.
                </Typography>)}
            </AccordionDetails>
          </Accordion>)}

        
        {(row.count_notes ?? 0) > 0 && (<Accordion expanded={expandedSections.has('notes')} onChange={() => handleAccordionChange('notes')}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Notes ({row.count_notes})</Typography>
            </AccordionSummary>
            <AccordionDetails>
              {notesLoading ? (<Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={24}/>
                </Box>) : notes.length > 0 ? (<Stack spacing={1}>
                  {notes.map((note, index) => (<Box key={note.propertyId || index} sx={{
                        p: 1,
                        border: '1px solid #e0e0e0',
                        borderRadius: 1,
                    }}>
                      <Typography variant="body2">{note.value}</Typography>
                    </Box>))}
                </Stack>) : (<Typography variant="body2" color="textSecondary">
                  No notes available.
                </Typography>)}
            </AccordionDetails>
          </Accordion>)}
      </Box>
    </Box>);
};
export default EmailDetailPanel;
//# sourceMappingURL=email-detail-panel.jsx.map