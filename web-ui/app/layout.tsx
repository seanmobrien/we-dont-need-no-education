// Add to your app root
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import MuiXLicense from '@/components/mui/MuiXLicense';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { ThemeProvider } from '@/lib/themes/provider';
import './globals.css';
import QueryProvider from '@/components/general/react-query/query-provider';
import { TrackWithAppInsight } from '@/components/general/telemetry/track-with-app-insight';
import { ChatPanelProvider } from '@/components/ai/chat-panel';
import { SessionProvider } from '@/components/auth/session-provider';
import { KeyRefreshNotify } from '@/components/auth/key-refresh-notify';
import InitColorSchemeScript from '@mui/material/InitColorSchemeScript';
import { Suspense } from 'react';
import { cookies } from 'next/headers';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'School Case Tracker',
  description: 'A tracker for school cases and incidents',
};

const stableAppRouterOptions = {
  cache: {
    type: 'stable',
    maxAge: 1000 * 60 * 60, // 1 hour
    staleWhileRevalidate: true,
  },
  enableCssLayer: true,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeName = await cookies().then((x) =>
    x.get('theme')?.value === 'light' ? 'light' : 'dark',
  );
  return (
    <html lang="en" suppressHydrationWarning>
      <head></head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <InitColorSchemeScript defaultMode={themeName} />
        <QueryProvider>
          <SessionProvider>
            <ChatPanelProvider>
              <Suspense>
                <TrackWithAppInsight />
              </Suspense>
              <KeyRefreshNotify />
              <MuiXLicense />
              <AppRouterCacheProvider options={stableAppRouterOptions}>
                <ThemeProvider defaultTheme={themeName}>
                  {children}
                </ThemeProvider>
              </AppRouterCacheProvider>
            </ChatPanelProvider>
          </SessionProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
