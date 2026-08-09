/**
 * @jest-environment node
 */

import { drizDbWithInit } from '@compliance-theater/database/orm';
import { log } from '@compliance-theater/logger';
import { getAccountTokens } from '../../../src/lib/server/get-account-tokens';

describe('getAccountTokens', () => {
  beforeEach(() => {
    (drizDbWithInit as jest.Mock).mockReset();
    (log as jest.Mock).mockClear();
  });

  it('returns null and logs a warning when the optional DB lookup fails', async () => {
    const lookupError = new Error('connection unavailable');
    (drizDbWithInit as jest.Mock).mockRejectedValue(lookupError);

    await expect(
      getAccountTokens({ providerAccountId: 'provider-subject' }),
    ).resolves.toBeNull();

    expect(log).toHaveBeenCalledTimes(1);

    const logger = {
      warn: jest.fn(),
      error: jest.fn(),
    };
    const [logCallback] = (log as jest.Mock).mock.calls[0];
    logCallback(logger);

    expect(logger.warn).toHaveBeenCalledWith(
      'Account token DB lookup failed; continuing without persisted tokens for provider-subject',
      lookupError,
    );
    expect(logger.error).not.toHaveBeenCalled();
  });
});