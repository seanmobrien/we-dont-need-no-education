'use client';
import React from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import PersonIcon from '@mui/icons-material/Person';
import ScheduleIcon from '@mui/icons-material/Schedule';
import SubjectIcon from '@mui/icons-material/Subject';
import EmailIcon from '@mui/icons-material/Email';
import Link from 'next/link';
import siteBuilder from '@/lib/site-util/url-builder';
import { useEmailMessageQuery } from './hooks';
import { LoadingEmail } from './loading';
import { Attachments } from './attachments';
export const EmailBody = ({ emailId }) => {
    const { email, isFetching } = useEmailMessageQuery({
        emailId: emailId,
    });
    return isFetching ? (<LoadingEmail />) : (<>
      {email && (<>
          <Typography variant="h4" gutterBottom>
            Email Details
          </Typography>

          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <PersonIcon sx={{ mr: 1, color: 'text.secondary' }}/>
              <Typography variant="h6" sx={{ mr: 1 }}>
                Sent By:
              </Typography>
              <Chip label={`${email.sender?.name} (${email.sender?.email})`} variant="outlined" color="primary"/>
            </Box>

            <Box sx={{
                display: 'flex',
                alignItems: 'center',
                mb: 2,
                flexWrap: 'wrap',
            }}>
              <EmailIcon sx={{ mr: 1, color: 'text.secondary' }}/>
              <Typography variant="h6" sx={{ mr: 1 }}>
                Recipients:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {email.recipients?.map((recipient, index) => (<Chip key={`recipient-${recipient.contactId}-${index}`} label={`${recipient.name} (${recipient.email})`} variant="outlined" color="secondary" size="small"/>)) || []}
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <SubjectIcon sx={{ mr: 1, color: 'text.secondary' }}/>
              <Typography variant="h6" sx={{ mr: 1 }}>
                Subject:
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                {email.subject}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <ScheduleIcon sx={{ mr: 1, color: 'text.secondary' }}/>
              <Typography variant="h6" sx={{ mr: 1 }}>
                Sent Timestamp:
              </Typography>
              <Typography variant="body1">
                {email.sentOn instanceof Date
                ? email.sentOn.toLocaleString()
                : new Date(email.sentOn).toLocaleString()}
              </Typography>
            </Box>

            {email.parentEmailId && (<Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <EmailIcon sx={{ mr: 1, color: 'text.secondary' }}/>
                <Typography variant="h6" sx={{ mr: 1 }}>
                  Parent Email ID:
                </Typography>
                <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                  <Link href={siteBuilder.messages.email(email.parentEmailId)}>
                    {email.parentEmailId}
                  </Link>
                </Typography>
              </Box>)}

            {email.threadId && (<Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ mr: 1 }}>
                  Thread ID:
                </Typography>
                <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                  {email.threadId}
                </Typography>
              </Box>)}
          </Box>

          <Divider sx={{ my: 3 }}/>

          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Email Contents
            </Typography>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="body1" component="pre" sx={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontFamily: 'inherit',
            }}>
                  {email.body || 'No content available'}
                </Typography>
              </CardContent>
            </Card>
          </Box>
          <Attachments emailId={emailId}/>
        </>)}
      {!email && (<Card>
          <CardContent>
            <Alert severity="warning">Email not found</Alert>
          </CardContent>
        </Card>)}
    </>);
};
//# sourceMappingURL=email-body.jsx.map