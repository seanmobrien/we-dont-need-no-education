import { Box } from '@mui/material';
import CtaGrid from './grid';
import { EmailDashboardLayout } from '@/components/email-message/dashboard-layout';
import { auth } from '@/auth';
import { ChatPanel, ChatPanelLayout } from '@/components/ai/chat-panel';
import { Metadata } from 'next';

export const generateMetadata = async (): Promise<Metadata> => {
  return {
    title: 'Call to Action',
  };
};

const Page = async () => {
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
          <CtaGrid />
          <ChatPanel page="email-cta" isDashboardLayout={true} />
        </Box>
      </ChatPanelLayout>
    </EmailDashboardLayout>
  );
};

export default Page;
