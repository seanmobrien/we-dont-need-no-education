/**
 * @fileoverview Branding configuration for Email Dashboard Layout
 * 
 * This module provides the branding configuration used in the email dashboard
 * layout, including the application title and logo displayed in the header.
 * 
 * @module components/email-message/dashboard-layout/branding
 * @version 1.0.0
 * @since 2025-07-19
 */

import * as React from 'react';
import Image from 'next/image';
import { BrandingConfig } from './types';

/**
 * Branding configuration for the email dashboard layout.
 * 
 * @constant Branding
 * @description Defines the title and logo displayed in the dashboard header.
 * The logo uses a 40x40 pixel badge image located in the public directory.
 * Uses Next.js Image component for optimized loading and performance.
 * 
 * @example
 * ```tsx
 * // Used in NextAppProvider
 * <NextAppProvider branding={Branding}>
 *   <DashboardLayout>
 *     {children}
 *   </DashboardLayout>
 * </NextAppProvider>
 * ```
 */
export const Branding: BrandingConfig = {
  title: 'Mystery Compliance Theater 2000',
  logo: (
    <>
      <Image
        src={require("@/public/static/logo/badge_40x40.png")}
        alt="Mystery Compliance Theater 2000 Logo"
        width={40}
        height={40}
        priority
      />
    </>
  ),
} as const;
