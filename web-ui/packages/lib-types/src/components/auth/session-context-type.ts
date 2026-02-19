import { type KeyValidationStatus } from './key-validation-status';

export type { KeyValidationStatus } from './key-validation-status';

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
