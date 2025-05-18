import { EmailDashboardLayout } from '@/components/email-message/dashboard-layout';
import { KeyPointsGrid } from '@/components/email-message/key-points/grid';
import { auth } from '@/auth';

export default async function Page() {
  const session = await auth();

  return (
    <EmailDashboardLayout session={session}>
      <KeyPointsGrid emailId="cb4129e3-619a-430e-a0e5-8af1fe166fe3" />;
    </EmailDashboardLayout>
  );
}
