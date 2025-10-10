import { auth } from '@/auth';
import { EmailDashboardLayout } from '@/components/email-message/dashboard-layout';
import EmailViewer from '@/components/email-message/email-viewer';
import { extractParams } from '@/lib/nextjs-util/utils';
import { resolveEmailIdWithRedirect } from '@/lib/email/email-id-resolver';
import { Box } from '@mui/material';
import React from 'react';
import { Metadata } from 'next';

export const generateMetadata = async (): Promise<Metadata> => {
  return {
    title: 'Emails',
  };
};

const Home = async (args: { params: Promise<{ emailId: string }> }) => {
  const { emailId: emailIdParam } = await extractParams(args);

  // Resolve email ID and handle redirects for document IDs
  const emailId = await resolveEmailIdWithRedirect(
    emailIdParam,
    '/messages/email/[emailId]',
  );

  const session = await auth();

  return (
    <EmailDashboardLayout session={session}>
      <Box
        sx={{
          width: '100%',
          '& > :not(style)': {
            m: 1,
          },
        }}
      >
        <EmailViewer emailId={emailId} />
      </Box>
    </EmailDashboardLayout>
  );
};

export default Home;
