import { auth } from '@/auth';
import { EmailDashboardLayout } from '@/components/email-message/dashboard-layout';
import { Box } from '@mui/material';
import { EmailHeaderGrid } from './grid';
import { ChatPanel, ChatPanelLayout } from '@/components/ai/chat-panel';
import { Metadata } from 'next';

export const generateMetadata = async (): Promise<Metadata> => {
  return {
    title: 'Email Headers',
  };
};

const Home = async () => {
  const session = await auth();

  return (
    <EmailDashboardLayout session={session}>
      <ChatPanelLayout isDashboardLayout={true}>
        <Box
          sx={{
            width: '100%',
            '& > :not(style)': {
              m: 1,
            },
          }}
        >
          <EmailHeaderGrid />
          <ChatPanel page="email-headers" isDashboardLayout={true} />
        </Box>
      </ChatPanelLayout>
    </EmailDashboardLayout>
  );
};

export default Home;
