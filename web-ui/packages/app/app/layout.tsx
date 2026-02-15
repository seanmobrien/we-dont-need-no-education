// Add to your app root
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import MuiXLicense from '@/components/mui/MuiXLicense';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { ThemeProvider } from '@compliance-theater/themes';
import './globals.css';
import QueryProvider from '@/components/general/react-query/query-provider';
import { TrackWithAppInsight } from '@/components/general/telemetry/track-with-app-insight';
import { ChatPanelProvider } from '@/components/ai/chat-panel';
import { SessionProvider } from '@compliance-theater/auth/components/session-provider';
import { KeyRefreshNotify } from '@compliance-theater/auth/components/key-refresh-notify';
import InitColorSchemeScript from '@mui/material/InitColorSchemeScript';
import { Suspense} from 'react';
// import { cookies } from 'next/headers';
import { FlagProvider } from '@compliance-theater/feature-flags/components/flag-provider';
import { state } from '@/lib/site-util/app-startup';

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
}: {
  children: React.ReactNode;
}) {
  // Guard against a shutdown app
  if (state() === 'done') {
    return (
      <html lang="en">
        <body>
          <main role="main" aria-label="Shutdown message" style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
            <h1 tabIndex={0}>App is shutting down</h1>
          </main>
        </body>
      </html>
    );
  }
  const themeName = 'light';
 
  /*
  let themeName: 'light' | 'dark' | undefined;
  try{
    const cookieStore = await cookies();
    themeName = cookieStore.get('theme')?.value === 'light' ? 'light' : 'dark';
  } catch {
    themeName = undefined;
  }
  */
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
              <FlagProvider>
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
              </FlagProvider>
            </ChatPanelProvider>
          </SessionProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
