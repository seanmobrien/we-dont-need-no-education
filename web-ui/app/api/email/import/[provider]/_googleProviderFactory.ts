import { auth } from '@/auth';
import { credentialFactory } from '@/lib/site-util/auth';
import { google } from 'googleapis';
import { NextResponse } from 'next/server';

export const googleProviderFactory = async (provider: string) => {
  if (provider !== 'google') {
    return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
  }
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const credential = await credentialFactory({
    provider,
    service: 'email',
    session,
  });

  const client = google.gmail({
    version: 'v1',
    auth: credential.client,
  });

  return {
    client,
    mail: client.users.messages,
  };
};
