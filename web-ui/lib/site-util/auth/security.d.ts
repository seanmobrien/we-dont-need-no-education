import type { Session } from '@auth/core/types';

declare module '@/lib/site-util/auth/security' {
  /**
   * Determines whether a signed-in user is authorized to access (read and/or write) another user's resources.
   *
   * Authorization rules:
   * 1. Returns false if either user ID is missing or falsy.
   * 2. Returns true if the signed-in user is the owner (IDs match).
   * 3. If not the owner:
   *    - Read access (write === false or omitted) is currently allowed for all users.
   *    - Write access (write === true) is denied.
   *
   * This logic is an interim placeholder until a full permissions / roles model is implemented.
   *
   * @param params Object containing user identifiers and requested access mode.
   * @param params.signedInUserId ID of the currently authenticated user.
   * @param params.ownerUserId ID of the resource owner.
   * @param params.write Optional flag indicating a write (mutable) operation; defaults to false (read-only).
   * @returns True if the user is authorized under the above rules; otherwise false.
   *
   * @remarks Future improvement: Replace blanket read access with role-based or ACL-driven evaluation.
   *
   * @example
   * // Owner requesting write access
   * isUserAuthorized({ signedInUserId: 10, ownerUserId: 10, write: true }); // true
   *
   * @example
   * // Non-owner requesting read access
   * isUserAuthorized({ signedInUserId: 3, ownerUserId: 10 }); // true
   *
   * @example
   * // Non-owner requesting write access
   * isUserAuthorized({ signedInUserId: 3, ownerUserId: 10, write: true }); // false
   */
  export const isUserAuthorized: (params: {
    signedInUserId: number;
    ownerUserId: number;
    write?: boolean;
  }) => Promise<boolean>;

  /**
   * Evaluates whether a given session is still active.
   * @param {Object} props - The properties object.
   * @param {Session | null | undefined} props.session - The session object to evaluate.
   * @returns {boolean} True if the session is active; otherwise false.
   */
  export const isSessionActive: (props: {
    session: Session | null | undefined;
  }) => boolean;
}
