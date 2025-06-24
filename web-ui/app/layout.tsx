// Add to your app root
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import MuiXLicense from '@/components/mui/MuiXLicense';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { ThemeProvider } from '@/lib/themes/provider';
import { ThemeSelector } from '@/components/theme/theme-selector';
import { Box } from '@mui/material';
import './globals.css';

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <MuiXLicense />
        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
          <ThemeProvider defaultTheme="dark">
            <Box
              sx={{
                position: 'fixed',
                top: 16,
                right: 16,
                zIndex: 1000,
              }}
            >
              <ThemeSelector />
            </Box>
            {children}
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
