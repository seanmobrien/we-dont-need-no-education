import { credentialFactory } from '/lib/site-util/auth';
import { google } from 'googleapis';
import { NextApiRequest } from 'next';
import { NextRequest, NextResponse } from 'next/server';

type CredentialOps = { req: NextRequest | NextApiRequest; userId?: number };

export const googleProviderFactory = async (
  provider: string,
  options: CredentialOps,
) => {
  if (provider !== 'google') {
    return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
  }
  if (!options.req) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const credential = await credentialFactory({
    provider,
    service: 'email',
    req: options.req,
    userId: options.userId,
  });

  const client = google.gmail({
    version: 'v1',
    auth: credential.client,
  });

  return {
    client,
    userId: credential.userId,
    mail: client.users.messages,
  };
};
