import * as React from 'react';
import { SignInPage, } from '@toolpad/core/SignInPage';
import { AuthError } from '@auth/core/errors';
import Image from 'next/image';
import { providerMap, signIn } from '../../../auth';
import { NextAppProvider } from '@toolpad/core/nextjs';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { dumpError, LoggedError } from '@compliance-theater/logger';
import { cookies } from 'next/headers';
const sharedImageProps = {
    style: { height: 200, width: 270 },
    height: 520,
    width: 533,
    alt: 'Compliance Theater Logo',
};
const LightImage = (<Image {...sharedImageProps} src="/static/logo/logo-light.png"/>);
const DarkImage = (<Image {...sharedImageProps} src="/static/logo/logo-dark.png"/>);
const BRANDING = {
    logo: LightImage,
    title: 'Compliance Theater',
};
const SignInSlots = {
    emailField: { autoFocus: false },
    form: { noValidate: true },
};
const SignIn = async () => {
    const signInImpl = async (provider, _formData, callbackUrl) => {
        'use server';
        try {
            return await signIn(provider.id, {
                redirectTo: callbackUrl ?? '/',
            });
        }
        catch (error) {
            if (isRedirectError(error)) {
                throw error;
            }
            const le = LoggedError.isTurtlesAllTheWayDownBaby(error);
            if (error instanceof AuthError) {
                return {
                    error: error.message,
                    type: error.type,
                };
            }
            return {
                error: dumpError(le),
                type: le.name,
            };
        }
    };
    const currentTheme = await cookies().then((x) => x.get('theme')?.value ?? 'dark');
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
    return (<>
      <NextAppProvider branding={BRANDING}>
        <SignInPage providers={providerMap} slotProps={SignInSlots} signIn={signInImpl}/>
      </NextAppProvider>
    </>);
};
export default SignIn;
//# sourceMappingURL=page.jsx.map