/**
 * Authorization utilities
 * @module @/lib/auth/authorized
 */

import { Session } from '@auth/core/types';
import { NextRequest } from 'next/server';

declare module '@/lib/auth/authorized' {
  /**
   * Evaluates whether the provided auth session authorizes access.
   * @param props Standard auth-js authorized argument model
   */
  export function authorized(props: {
    auth: Session | null;
    request?: NextRequest;
  }): Promise<boolean>;
}
