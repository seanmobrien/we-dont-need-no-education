import { Account } from '@auth/core/types';
import { logEvent } from '../logger';

export const signIn =
  () =>
  async (
    { account }: { account?: Account | Record<string, unknown> } | undefined = {
      account: undefined,
    },
  ) => {
    // Sign-in successful, log the event
    logEvent('signIn');
    return true;
  };
