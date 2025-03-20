import { OAuth2Client } from 'google-auth-library';
import { NextApiRequest } from 'next';
import { Session } from 'next-auth';
import { NextRequest } from 'next/server';

export type IServerSessionTokens = {
  gmail: Promise<string | null>;
  refresh: Promise<string>;
  access: Promise<string>;
};

export type IResolvedServerSessionTokens = {
  gmail: string | null;
  refresh: string;
  access: string;
};

export type IServerSession = {
  tokens: IServerSessionTokens;
  resolveTokens(): Promise<IResolvedServerSessionTokens>;
  flush(): Promise<void>;
};

export type SessionExt = Session & {
  server: IServerSession;
};

export type ICredential = {
  userId: number;
  refresh_token: string;
  access_token: string;
  client: OAuth2Client;
};

export const ServiceValues = ['email'] as const;
export type Service = (typeof ServiceValues)[number];

export type CredentialOptions = {
  provider: string;
  service: Service;
  req: NextRequest | NextApiRequest;
  userId?: number;
};

export type ICredentialProvider = {
  getCredential(options: CredentialOptions): Promise<ICredential>;
};
