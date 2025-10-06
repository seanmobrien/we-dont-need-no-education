'use client';
import { LicenseInfo } from '@mui/x-license';
import { env } from '/lib/site-util/env';

LicenseInfo.setLicenseKey(env('NEXT_PUBLIC_MUI_LICENSE') || '');

export default function MuiXLicense() {
  return null;
}
