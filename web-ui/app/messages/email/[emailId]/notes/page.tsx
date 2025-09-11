import { Box, Stack } from '@mui/material';
import { NoteGrid } from './grid';
import { EmailDashboardLayout } from '@/components/email-message/dashboard-layout';
import { auth } from '@/auth';
import { ChatPanel, ChatPanelLayout } from '@/components/ai/chat-panel';
import { extractParams } from '@/lib/nextjs-util/utils';
import { resolveEmailIdWithRedirect } from '@/lib/email/email-id-resolver';
import { Metadata } from 'next';

export const generateMetadata = async (): Promise<Metadata> => {
  return {
    title: 'Notes',
  };
};

const Home = async (args: { params: Promise<{ emailId: string }> }) => {
  const { emailId: emailIdParam } = await extractParams(args);
  
  // Resolve email ID and handle redirects for document IDs
  await resolveEmailIdWithRedirect(
    emailIdParam,
    '/messages/email/[emailId]/notes'
  );
  
  const session = await auth();

  return (
    <EmailDashboardLayout session={session}>
      <ChatPanelLayout >
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
            <ChatPanel page="email-notes"  />
          </Stack>
        </Box>
      </ChatPanelLayout>
    </EmailDashboardLayout>
  );
};

export default Home;
