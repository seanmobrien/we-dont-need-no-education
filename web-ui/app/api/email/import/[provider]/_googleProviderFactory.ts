import { auth } from '@/auth';
import { credentialFactory } from '@/lib/site-util/auth';
import { google } from 'googleapis';
import { Session } from 'next-auth';
import { NextResponse } from 'next/server';

type CredentialOps = { userId: number } | { session: Session };

export const googleProviderFactory = async (
  provider: string,
  options?: CredentialOps
) => {
  if (provider !== 'google') {
    return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
  }
  let credentialOptions: CredentialOps | undefined = options;
  if (!credentialOptions) {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    credentialOptions = { session };
  }
  const credential = await credentialFactory({
    provider,
    service: 'email',
    ...credentialOptions,
  });

  const client = google.gmail({
    version: 'v1',
    auth: credential.client,
  });

  return {
    client,
    userId:
      'userId' in credentialOptions
        ? credentialOptions.userId
        : Number(credentialOptions.session.user!.id!),
    mail: client.users.messages,
  };
};
