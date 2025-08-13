import { auth } from '@/auth';
import { EmailDashboardLayout } from '@/components/email-message/dashboard-layout';
import EmailViewer from '@/components/email-message/email-viewer';
import { extractParams } from '@/lib/nextjs-util/utils';
import { Box } from '@mui/material';
import React from 'react';
import { Metadata } from 'next';

export const generateMetadata = async (): Promise<Metadata> => {
  return {
    title: 'Emails',
  };
};

const Home = async (args: { params: Promise<{ emailId: string }> }) => {
  const { emailId } = await extractParams(args);
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
