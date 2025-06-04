import { Box, Stack } from '@mui/material';
import { NoteGrid } from './grid';
import { EmailDashboardLayout } from '@/components/email-message/dashboard-layout';
import { auth } from '@/auth';
import { ChatPanel } from '@/components/ai/chat-panel';

const Home = async () => {
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
        <Stack>
          <NoteGrid />
          <ChatPanel page="email-notes" />
        </Stack>
      </Box>
    </EmailDashboardLayout>
  );
};

export default Home;
