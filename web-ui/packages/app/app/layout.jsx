import { Geist, Geist_Mono } from 'next/font/google';
import MuiXLicense from '@/components/mui/MuiXLicense';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { ThemeProvider } from '@compliance-theater/themes';
import './globals.css';
import QueryProvider from '@/components/general/react-query/query-provider';
import { TrackWithAppInsight } from '@/components/general/telemetry/track-with-app-insight';
import { ChatPanelProvider } from '@/components/ai/chat-panel';
import { SessionProvider } from '@/components/auth/session-provider';
import { KeyRefreshNotify } from '@/components/auth/key-refresh-notify';
import InitColorSchemeScript from '@mui/material/InitColorSchemeScript';
import { Suspense } from 'react';
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
export const metadata = {
    title: 'School Case Tracker',
    description: 'A tracker for school cases and incidents',
};
const stableAppRouterOptions = {
    cache: {
        type: 'stable',
        maxAge: 1000 * 60 * 60,
        staleWhileRevalidate: true,
    },
    enableCssLayer: true,
};
export default async function RootLayout({ children, }) {
    if (state() === 'done') {
        return (<html lang="en">
        <body>
          <main role="main" aria-label="Shutdown message" style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
            <h1 tabIndex={0}>App is shutting down</h1>
          </main>
        </body>
      </html>);
    }
    const themeName = 'light';
    return (<html lang="en" suppressHydrationWarning>
      <head></head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <InitColorSchemeScript defaultMode={themeName}/>
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
    </html>);
}
//# sourceMappingURL=layout.jsx.map