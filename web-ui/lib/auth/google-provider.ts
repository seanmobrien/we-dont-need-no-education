import type { Provider } from '@auth/core/providers';
import Google, { GoogleProfile } from 'next-auth/providers/google';

export const setupGoogleProvider = (): Provider[] => {
  const providerArgs = {
    clientId: process.env.GOOGLE_CLIENT_ID as string, // Added type assertion
    clientSecret: process.env.GOOGLE_CLIENT_SECRET as string, // Added type assertion
    authorization: {
      params: {
        access_type: 'offline',
        prompt: 'consent',
        response_type: 'code',
        scope:
          'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/gmail.readonly', //
      },
    },
  };
  const google = Google<GoogleProfile>(providerArgs);
  return [google];
};
