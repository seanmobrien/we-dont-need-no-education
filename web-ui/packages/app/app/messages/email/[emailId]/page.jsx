import { auth } from '@/auth';
import { EmailDashboardLayout } from '@/components/email-message/dashboard-layout';
import EmailViewer from '@/components/email-message/email-viewer';
import { extractParams } from '@/lib/nextjs-util/server/utils';
import { resolveEmailIdWithRedirect } from '@/lib/email/email-id-resolver';
import Box from '@mui/material/Box';
import React from 'react';
import { notFound } from 'next/navigation';
export const generateMetadata = async () => {
    return {
        title: 'Emails',
    };
};
const Home = async (args) => {
    const { emailId: emailIdParam } = await extractParams(args);
    const emailId = await resolveEmailIdWithRedirect(emailIdParam, '/messages/email/[emailId]');
    const session = await auth();
    if (!emailId) {
        notFound();
    }
    return (<EmailDashboardLayout session={session}>
      <Box sx={{
            width: '100%',
            '& > :not(style)': {
                m: 1,
            },
        }}>
        <EmailViewer emailId={emailId}/>
      </Box>
    </EmailDashboardLayout>);
};
export default Home;
//# sourceMappingURL=page.jsx.map