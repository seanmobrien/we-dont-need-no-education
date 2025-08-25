'use client';

import { getAppInsights } from '@/instrument/browser';
import { useSession } from '@/components/auth/session-provider';
import { Session } from 'next-auth';
import { usePathname, useSearchParams } from 'next/dist/client/components/navigation';
import { useEffect, useMemo } from 'react';

export const TrackWithAppInsight = () => {
  const { status, data: session } = useSession<Session>();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const user = session?.user;
  const userId = user?.id ?? null;
  const email = user?.email ?? null;

  const pageUri = useMemo(() => {
    const qs = searchParams?.toString();
    return qs ? `${window.location.origin}${pathname}?${qs}` : `${window.location.origin}${pathname}`;
  }, [pathname, searchParams]);

  useEffect(() => {
    const appInsights = getAppInsights();
    if (!appInsights) return;

    if (status === 'authenticated' && userId !== null) {
      appInsights.setAuthenticatedUserContext(userId, email || '', true);
    } else {
      appInsights.clearAuthenticatedUserContext();
    }

    const name = document.title;
    appInsights.trackPageView({
      name,
      uri: pageUri,
      properties: {
        contentName: name,
        id: pathname,
      },
    });
  }, [status, pathname, pageUri, email, userId]);

  return null;
};
