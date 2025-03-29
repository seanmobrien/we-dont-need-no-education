import EmailForm from '@/components/email-message/form';
import { extractParams } from '@/lib/nextjs-util';
import { Box } from '@mui/material';
import React from 'react';

const Home = async (args: { params: Promise<{ emailId: string }> }) => {
  const { emailId } = await extractParams(args);
  return (
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
  );
};

export default Home;
