import { auth } from '@/auth';
import { EmailDashboardLayout } from '@/components/email-message/dashboard-layout';
import { Box } from '@mui/material';
import KpiGrid from './grid';
import { ChatPanel } from '@/components/ai/chat-panel';
import { Metadata } from 'next';

export const generateMetadata = async (): Promise<Metadata> => {
  return {
    title: 'Key Points',
  };
};

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
        <KpiGrid />
        <ChatPanel page="email-key-points" isDashboardLayout={true} />
      </Box>
    </EmailDashboardLayout>
  );
};

export default Home;
