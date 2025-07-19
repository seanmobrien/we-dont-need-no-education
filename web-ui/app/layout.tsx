// Add to your app root
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import MuiXLicense from '@/components/mui/MuiXLicense';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { ThemeProvider } from '@/lib/themes/provider';
import './globals.css';
import QueryProvider from '@/components/general/react-query/query-provider';
import { TrackWithAppInsight } from '@/components/general/telemetry';
import { ChatPanelProvider } from '@/components/ai/chat-panel';
import InitColorSchemeScript from '@mui/material/InitColorSchemeScript';

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head></head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <InitColorSchemeScript defaultMode="dark" />
        <QueryProvider>
          <ChatPanelProvider>
            <TrackWithAppInsight />
            <MuiXLicense />
            <AppRouterCacheProvider options={stableAppRouterOptions}>
              <ThemeProvider defaultTheme="dark">{children}</ThemeProvider>
            </AppRouterCacheProvider>
          </ChatPanelProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
