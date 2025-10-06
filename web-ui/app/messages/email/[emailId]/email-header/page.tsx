import { auth } from '/auth';
import { EmailDashboardLayout } from '/components/email-message/dashboard-layout';
import { Box } from '@mui/material';
import { EmailHeaderGrid } from './grid';
import { ChatPanel, ChatPanelLayout } from '/components/ai/chat-panel';
import { extractParams } from '/lib/nextjs-util/utils';
import { resolveEmailIdWithRedirect } from '/lib/email/email-id-resolver';
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
            '& > :not(style)': {
              m: 1,
            },
          }}
        >
          <EmailHeaderGrid />
          <ChatPanel page="email-headers" />
        </Box>
      </ChatPanelLayout>
    </EmailDashboardLayout>
  );
};

export default Home;
