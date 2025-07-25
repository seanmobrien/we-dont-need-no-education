import { Box } from '@mui/material';
import CtaResponseGrid from './grid';
import { EmailDashboardLayout } from '@/components/email-message/dashboard-layout';
import { auth } from '@/auth';
import { ChatPanel, ChatPanelLayout } from '@/components/ai/chat-panel';
import { Metadata } from 'next';

export const generateMetadata = async (): Promise<Metadata> => {
  return {
    title: 'Responsive Actions',
  };
};

const Home = async () => {
  const session = await auth();

  return (
    <EmailDashboardLayout session={session}>
      <ChatPanelLayout>
        <Box
          sx={{
            width: '100%',
            '& > :not(style)': {
              m: 1,
            },
          }}
        >
          <CtaResponseGrid />
          <ChatPanel page="email-responsive-action"  />
        </Box>
      </ChatPanelLayout>
    </EmailDashboardLayout>
  );
};

export default Home;
