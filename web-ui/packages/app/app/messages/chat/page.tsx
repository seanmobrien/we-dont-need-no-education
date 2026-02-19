import * as React from '@compliance-theater/types/react';
import { auth } from '@compliance-theater/auth';
import { ChatPageClient } from './chat-page-client';

const Page = async () => {
  const session = await auth();
  return <ChatPageClient session={session} />;
};

export default Page;
