import * as React from 'react';
import {
  AuthResponse,
  SignInPage,
  type AuthProvider,
} from '@toolpad/core/SignInPage';
import { AuthError } from 'next-auth';
import Image from 'next/image';
import { providerMap, signIn } from '../../../auth';
import { NextAppProvider } from '@toolpad/core/nextjs';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { dumpError, LoggedError } from '/lib/react-util';
import { cookies } from 'next/headers';

const sharedImageProps = {
  style: { height: 200, width: 270 },
  height: 520,
  width: 533,
  alt: 'Compliance Theater Logo',
};

const LightImage = (
  // eslint-disable-next-line jsx-a11y/alt-text
  <Image {...sharedImageProps} src="/static/logo/logo-light.png" />
);
const DarkImage = (
  // eslint-disable-next-line jsx-a11y/alt-text
  <Image {...sharedImageProps} src="/static/logo/logo-dark.png" />
);

const BRANDING = {
  logo: LightImage,
  title: 'Compliance Theater',
};

const SignInSlots = {
  emailField: { autoFocus: false },
  form: { noValidate: true },
};

const SignIn = async () => {
  const signInImpl = async (
    provider: AuthProvider,
    _formData: FormData,
    callbackUrl?: string,
  ): Promise<AuthResponse> => {
    'use server';
    try {
      return await signIn(provider.id, {
        redirectTo: callbackUrl ?? '/',
      });
    } catch (error) {
      // The desired flow for successful sign in in all cases
      // and unsuccessful sign in for OAuth providers will cause a `redirect`,
      // and `redirect` is a throwing function, so we need to re-throw
      // to allow the redirect to happen
      // Source: https://github.com/vercel/next.js/issues/49298#issuecomment-1542055642
      // Detect a `NEXT_REDIRECT` error and re-throw it
      if (isRedirectError(error)) {
        throw error;
      }
      const le = LoggedError.isTurtlesAllTheWayDownBaby(error);
      // Handle Auth.js errors
      if (error instanceof AuthError) {
        return {
          error: error.message,
          type: error.type,
        };
      }
      // An error boundary must exist to handle unknown errors
      return {
        error: dumpError(le),
        type: le.name,
      };
    }
  };
  const currentTheme = await cookies().then(
    (x) => x.get('theme')?.value ?? 'dark',
  );
  switch (currentTheme) {
    case 'light':
      BRANDING.logo = LightImage;
      break;
    case 'dark':
      BRANDING.logo = DarkImage;
      break;
    default:
      BRANDING.logo = DarkImage;
      break;
  }
  return (
    <>
      <NextAppProvider branding={BRANDING}>
        <SignInPage
          providers={providerMap}
          slotProps={SignInSlots}
          signIn={signInImpl}
        />
      </NextAppProvider>
    </>
  );
};

export default SignIn;
