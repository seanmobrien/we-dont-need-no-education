/**
 * Type definitions for session provider
 * @module components/auth/session-provider/types
 */

import { ValidKeyValidationStatusValues } from './values';
declare module '@/components/auth/session-provider/types' {
  /**
   * Key validation states for user session
   */
  export type KeyValidationStatus =
    (typeof ValidKeyValidationStatusValues)[number];

  export type SessionResponse<TSessionData extends object> = {
    status: 'authenticated' | 'unauthenticated';
    data: TSessionData | null;
    publicKeys?: string[];
  };

  export type SessionContextType<TSessionData extends object> = {
    status: 'loading' | 'authenticated' | 'unauthenticated';
    data: TSessionData | null;
    isFetching: boolean;
    refetch: () => void;
    userHash?: string;
    publicKeys?: string[];
    keyValidation: {
      status: KeyValidationStatus;
      lastValidated?: Date;
      error?: string;
    };
  };
}
