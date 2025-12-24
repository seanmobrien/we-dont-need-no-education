/**
 * A user ID that should never be used for a real user.  This is used
 * as a match criteria when requests are made from an unauthenticated
 * context.  Intentionally an obtuse number to avoid collisions with
 * real user IDs.
 */
export const NEVER_USE_USER_ID = -942370932 as const;
