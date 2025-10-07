import * as React from 'react';
import { auth } from '/auth';
import { ChatPageClient } from './chat-page-client';

const Page = async () => {
  const session = await auth();
  return <ChatPageClient session={session} />;
};

export default Page;
