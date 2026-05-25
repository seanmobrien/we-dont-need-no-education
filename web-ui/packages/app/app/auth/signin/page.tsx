import * as React from 'react';
import {
  AuthResponse,
  SignInPage,
  type AuthProvider,
} from '@toolpad/core/SignInPage';
import { isAuthError } from '@compliance-theater/auth-compat/runtime';
import Image from 'next/image';
import { providerMap, signIn } from '@compliance-theater/auth/server';
import { NextAppProvider } from '@toolpad/core/nextjs';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { dumpError, LoggedError } from '@compliance-theater/logger';
import { cookies } from 'next/headers';

const normalizeCallbackUrl = (value: string | undefined): string | undefined => {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  if (trimmed.startsWith('/')) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.origin === 'http://localhost:3000') {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    return undefined;
  }

  return undefined;
};

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

const SignIn = async ({
  searchParams,
}: {
  searchParams?: Promise<{ callbackUrl?: string | string[] }>;
}) => {
  type SignInSearchParams = { callbackUrl?: string | string[] };
  const resolvedSearchParams: SignInSearchParams = searchParams
    ? await searchParams
    : {};
  const callbackFromQuery = Array.isArray(resolvedSearchParams?.callbackUrl)
    ? resolvedSearchParams.callbackUrl[0]
    : resolvedSearchParams?.callbackUrl;
  const initialCallbackUrl = normalizeCallbackUrl(callbackFromQuery);

  const signInImpl = async (
    provider: AuthProvider,
    _formData: FormData,
    callbackUrl?: string,
  ): Promise<AuthResponse> => {
    'use server';
    try {
      return await signIn(provider.id, {
        redirectTo:
          normalizeCallbackUrl(callbackUrl) ??
          initialCallbackUrl ??
          '/messages',
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
      if (isAuthError(error)) {
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

