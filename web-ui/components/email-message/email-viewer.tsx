'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Divider,
  LinearProgress,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
} from '@mui/material';
import {
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Subject as SubjectIcon,
  Email as EmailIcon,
  AttachFile as AttachFileIcon,
  GetApp as DownloadIcon,
} from '@mui/icons-material';
import { EmailMessage } from '@/data-models/api/email-message';
import { getEmail } from '@/lib/api/client';
import { log } from '@/lib/logger';
import { isError, LoggedError } from '@/lib/react-util';
import { AbortablePromise, ICancellablePromiseExt } from '@/lib/typescript';
import Link from 'next/link';
import siteBuilder from '@/lib/site-util/url-builder';

interface EmailViewerProps {
  emailId: string;
}

interface EmailAttachment {
  unitId: number;
  attachmentId: number | null;
  fileName?: string;
  hrefDocument?: string;
  hrefApi?: string;
}

const EmailViewer: React.FC<EmailViewerProps> = ({ emailId }) => {
  const [email, setEmail] = useState<EmailMessage | null>(null);
  const [attachments, setAttachments] = useState<EmailAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Fetch email data
  useEffect(() => {
    let cancelled = false;
    let request: ICancellablePromiseExt<EmailMessage | void> | null = null;

    if (emailId) {
      setLoading(true);
      setError('');

      request = getEmail(emailId)
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
            source: 'email-viewer: load email',
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
  }, [emailId]);

  // Fetch attachments for this email
  useEffect(() => {
    let cancelled = false;

    const fetchAttachments = async () => {
      if (!emailId) return;

      try {
        // Call the email attachments API
        const response = await fetch(`/api/email/${emailId}/attachments`);
        if (!response.ok) {
          if (response.status === 404) {
            // No attachments found, that's okay
            setAttachments([]);
            return;
          }
          throw new Error('Failed to fetch attachments');
        }

        const data = await response.json();

        if (!cancelled) {
          setAttachments(data || []);
        }
      } catch (error) {
        if (!cancelled) {
          log((l) =>
            l.error({
              message: 'Error fetching attachments',
              data: { emailId, error: String(error) },
            }),
          );
          // Don't set attachments error - just log it and continue
          setAttachments([]);
        }
      }
    };

    fetchAttachments();

    return () => {
      cancelled = true;
    };
  }, [emailId]);

  const handleDownload = (attachment: EmailAttachment) => {
    if (attachment.hrefDocument) {
      window.open(attachment.hrefDocument, '_blank');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Loading Email...
          </Typography>
          <LinearProgress />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error">{error}</Alert>
        </CardContent>
      </Card>
    );
  }

  if (!email) {
    return (
      <Card>
        <CardContent>
          <Alert severity="warning">Email not found</Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h4" gutterBottom>
          Email Details
        </Typography>

        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />
            <Typography variant="h6" sx={{ mr: 1 }}>
              Sent By:
            </Typography>
            <Chip
              label={`${email.sender?.name} (${email.sender?.email})`}
              variant="outlined"
              color="primary"
            />
          </Box>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              mb: 2,
              flexWrap: 'wrap',
            }}
          >
            <EmailIcon sx={{ mr: 1, color: 'text.secondary' }} />
            <Typography variant="h6" sx={{ mr: 1 }}>
              Recipients:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {email.recipients?.map((recipient, index) => (
                <Chip
                  key={`recipient-${recipient.contactId}-${index}`}
                  label={`${recipient.name} (${recipient.email})`}
                  variant="outlined"
                  color="secondary"
                  size="small"
                />
              )) || []}
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <SubjectIcon sx={{ mr: 1, color: 'text.secondary' }} />
            <Typography variant="h6" sx={{ mr: 1 }}>
              Subject:
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
              {email.subject}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <ScheduleIcon sx={{ mr: 1, color: 'text.secondary' }} />
            <Typography variant="h6" sx={{ mr: 1 }}>
              Sent Timestamp:
            </Typography>
            <Typography variant="body1">
              {email.sentOn instanceof Date
                ? email.sentOn.toLocaleString()
                : new Date(email.sentOn).toLocaleString()}
            </Typography>
          </Box>

          {email.parentEmailId && (
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <EmailIcon sx={{ mr: 1, color: 'text.secondary' }} />
              <Typography variant="h6" sx={{ mr: 1 }}>
                Parent Email ID:
              </Typography>
              <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                <Link href={siteBuilder.messages.email(email.parentEmailId)}>
                  {email.parentEmailId}
                </Link>
              </Typography>
            </Box>
          )}

          {email.threadId && (
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ mr: 1 }}>
                Thread ID:
              </Typography>
              <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                {email.threadId}
              </Typography>
            </Box>
          )}
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Email Contents
          </Typography>
          <Card variant="outlined">
            <CardContent>
              <Typography
                variant="body1"
                component="pre"
                sx={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontFamily: 'inherit',
                }}
              >
                {email.body || 'No content available'}
              </Typography>
            </CardContent>
          </Card>
        </Box>

        {attachments.length > 0 && (
          <>
            <Divider sx={{ my: 3 }} />
            <Box>
              <Typography variant="h6" gutterBottom>
                Attachments ({attachments.length})
              </Typography>
              <List>
                {attachments.map((attachment) => (
                  <ListItem
                    key={`attachment-${attachment.unitId}`}
                    sx={{
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 1,
                      mb: 1,
                    }}
                  >
                    <ListItemIcon>
                      <AttachFileIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        attachment.fileName ||
                        `Attachment ${attachment.attachmentId}`
                      }
                      secondary={`Attachment ID: ${attachment.attachmentId}`}
                    />
                    {attachment.hrefDocument && (
                      <IconButton
                        edge="end"
                        onClick={() => handleDownload(attachment)}
                        color="primary"
                        title="Download attachment"
                      >
                        <DownloadIcon />
                      </IconButton>
                    )}
                  </ListItem>
                ))}
              </List>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default EmailViewer;
