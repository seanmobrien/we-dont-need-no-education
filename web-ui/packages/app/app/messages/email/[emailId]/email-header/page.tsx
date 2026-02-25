import { auth } from '@compliance-theater/auth';
import { EmailDashboardLayout } from '@/components/email-message/dashboard-layout';
import Box from '@mui/material/Box';
import { EmailHeaderGrid } from './grid';
import { ChatPanel, ChatPanelLayout } from '@/components/ai/chat-panel';
import { extractParams } from '@compliance-theater/nextjs/server/utils';
import { resolveEmailIdWithRedirect } from '@/lib/email/email-id-resolver';
import { Metadata } from 'next';

export const generateMetadata = async (): Promise<Metadata> => {
  return {
    title: 'Email Headers',
  };
};

const Home = async (args: { params: Promise<{ emailId: string }> }) => {
  const { emailId: emailIdParam } = await extractParams(args);

  // Resolve email ID and handle redirects for document IDs
  await resolveEmailIdWithRedirect(
    emailIdParam,
    '/messages/email/[emailId]/email-header',
  );

  const session = await auth();

  return (
    <EmailDashboardLayout session={session}>
      <ChatPanelLayout>
        <Box
          sx={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            '& > :not(style)': {
              m: 1,
            },
          }}
        >
          <EmailHeaderGrid />
          <Box sx={{ flexGrow: 1, minHeight: 0 }}>
            <ChatPanel page="email-headers" />
          </Box>
        </Box>
      </ChatPanelLayout>
    </EmailDashboardLayout>
  );
};

export default Home;
