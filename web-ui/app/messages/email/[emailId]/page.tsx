import { auth } from '@/auth';
import { EmailDashboardLayout } from '@/components/email-message/dashboard-layout';
import EmailForm from '@/components/email-message/form';
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
        <EmailForm
          emailId={emailId}
          withButtons={true}
          afterSaveBehavior="redirect"
        />
      </Box>
    </EmailDashboardLayout>
  );
};

export default Home;
