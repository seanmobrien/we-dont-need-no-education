'use client';

import { getAppInsights } from '@/instrument/browser';
import { useSession } from '@/components/auth/session-provider';
import { Session } from 'next-auth';
import { usePathname } from 'next/dist/client/components/navigation';
import { useEffect } from 'react';

export const TrackWithAppInsight = () => {
  const { status, data: session } = useSession<Session>();

  const pathname = usePathname();
  let userId: string | null = null,
    email: string | null = null;
  // If we've authenticated, pass user context to app insights
  if (
    status === 'authenticated' &&
    session &&
    session.user &&
    session.user.id
  ) {
    const { user } = session;
    userId = user.id ?? null;
    email = user.email ?? null;
  }
  useEffect(() => {
    const name = document.title;
    const appInsights = getAppInsights();
    if (!appInsights) {
      return;
    }
    if (userId !== null) {
      appInsights.setAuthenticatedUserContext(userId, email || '', true);
    } else {
      appInsights.clearAuthenticatedUserContext();
    }
    appInsights.trackPageView({
      name,
      uri: window.location.href,
      properties: {
        contentName: name,
        id: pathname, // optional but helpful
      },
    });
  }, [pathname, email, userId]);

  // TODO: this would be a good place to add any custom telemetry hooks on useEffect
  return <></>;
};
