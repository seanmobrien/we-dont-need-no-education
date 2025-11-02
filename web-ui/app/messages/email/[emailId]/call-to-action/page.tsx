import { Box } from '@mui/material';
import CtaGrid from './grid';
import { EmailDashboardLayout } from '@/components/email-message/dashboard-layout';
import { auth } from '@/auth';
import { ChatPanel, ChatPanelLayout } from '@/components/ai/chat-panel';
import { extractParams } from '@/lib/nextjs-util/utils';
import { resolveEmailIdWithRedirect } from '@/lib/email/email-id-resolver';
import { Metadata } from 'next';

export const generateMetadata = async (): Promise<Metadata> => {
  return {
    title: 'Call to Action',
  };
};

const Page = async (args: { params: Promise<{ emailId: string }> }) => {
  const { emailId: emailIdParam } = await extractParams(args);

  // Resolve email ID and handle redirects for document IDs
  await resolveEmailIdWithRedirect(
    emailIdParam,
    '/messages/email/[emailId]/call-to-action',
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
          <CtaGrid />
          <Box sx={{ flexGrow: 1, minHeight: 0 }}>
            <ChatPanel page="email-cta" />
          </Box>
        </Box>
      </ChatPanelLayout>
    </EmailDashboardLayout>
  );
};

export default Page;
