

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
export const isUserAuthorized = (
  {
    signedInUserId,
    ownerUserId,
    write = false
  } : { 
    signedInUserId: number; 
    ownerUserId: number;
    write?: boolean;
   }) => {
  if (!signedInUserId || !ownerUserId) {
    return Promise.resolve(false);
  }
  if (signedInUserId === ownerUserId) {
    return Promise.resolve(true);
  }
  // for now all users have read access to all other users.
  // This will be updated once we have a proper permissions model.
  return Promise.resolve(write === false);
};