import { auth } from '@/auth';
import { EmailDashboardLayout } from '@/components/email-message/dashboard-layout';
import EmailViewer from '@/components/email-message/email-viewer';
import { extractParams } from '@/lib/nextjs-util';
import { Box } from '@mui/material';
import React from 'react';

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
