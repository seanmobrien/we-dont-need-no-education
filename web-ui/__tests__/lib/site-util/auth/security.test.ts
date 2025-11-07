import {
  isUserAuthorized,
  isSessionActive,
} from '@/lib/site-util/auth/security';
import type { Session } from '@auth/core/types';

describe('isUserAuthorized', () => {
  test('returns false if either id missing', async () => {
    const bad1 = {
      signedInUserId: undefined,
      ownerUserId: 1,
    } as unknown as Parameters<typeof isUserAuthorized>[0];
    const bad2 = {
      signedInUserId: 1,
      ownerUserId: undefined,
    } as unknown as Parameters<typeof isUserAuthorized>[0];
    await expect(isUserAuthorized(bad1)).resolves.toBe(false);
    await expect(isUserAuthorized(bad2)).resolves.toBe(false);
  });

  test('owner allowed write and read', async () => {
    await expect(
      isUserAuthorized({ signedInUserId: 10, ownerUserId: 10, write: true }),
    ).resolves.toBe(true);
    await expect(
      isUserAuthorized({ signedInUserId: 10, ownerUserId: 10 }),
    ).resolves.toBe(true);
  });

  test('non-owner read allowed, write denied', async () => {
    await expect(
      isUserAuthorized({ signedInUserId: 3, ownerUserId: 10 }),
    ).resolves.toBe(true);
    await expect(
      isUserAuthorized({ signedInUserId: 3, ownerUserId: 10, write: true }),
    ).resolves.toBe(false);
  });
});

describe('isSessionActive', () => {
  test('returns false for null/undefined session', () => {
    expect(isSessionActive({ session: null })).toBe(false);
    const undef = undefined as unknown as Session | null | undefined;
    expect(isSessionActive({ session: undef })).toBe(false);
  });

  test('returns false if no user or id', () => {
    const missingUser = {
      expires: new Date(Date.now() + 1000).toISOString(),
    } as unknown as Session;
    const missingUserId = {
      user: {},
      expires: new Date(Date.now() + 1000).toISOString(),
    } as unknown as Session;
    expect(isSessionActive({ session: missingUser })).toBe(false);
    expect(isSessionActive({ session: missingUserId })).toBe(false);
  });

  test('returns false if expires missing or invalid', () => {
    const missingExpires = {
      user: { id: '1' },
      expires: undefined,
    } as unknown as Session;
    const invalidExpires = {
      user: { id: '1' },
      expires: 'not-a-date',
    } as unknown as Session;
    expect(isSessionActive({ session: missingExpires })).toBe(false);
    expect(isSessionActive({ session: invalidExpires })).toBe(false);
  });

  test('returns true when expires in future and user id present', () => {
    const future = new Date(Date.now() + 1000 * 60 * 60).toISOString();
    const s: Session = {
      user: { id: 'u1' },
      expires: future,
    } as unknown as Session;
    expect(isSessionActive({ session: s })).toBe(true);
  });
});
