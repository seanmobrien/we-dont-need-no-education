import { Session } from '@auth/core/types';
import { NextRequest } from 'next/server';

export const authorized = async ({
  auth,
  request,
}: {
  auth: Session | null;
  request?: NextRequest;
}) => {
  if (request) {
    const { nextUrl } = request;
    const publicFolders = ['/static/'];
    if (publicFolders.some((folder) => nextUrl.pathname.startsWith(folder))) {
      return true;
    }
  }
  return !!auth;
};
