import { ValidKeyValidationStatusValues } from './values';

export type SessionResponse<TSessionData extends object> = {
  status: 'authenticated' | 'unauthenticated';
  data: TSessionData | null;
  publicKeys?: string[];
};

export type {
  SessionContextType,
  KeyValidationStatus,
} from '@compliance-theater/types/components/auth/session-context-type';