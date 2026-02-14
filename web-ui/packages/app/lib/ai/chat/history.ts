/**
 * Chat History Utilities
 * ------------------------------------------------------------------
 * Provides a helper for securely retrieving minimal chat metadata while
 * enforcing ownership authorization. The function performs a single
 * database lookup (lazy-initializing the Drizzle connection via
 * `drizDbWithInit`) and then validates that the requesting user is the
 * owner of the chat before returning any information.
 *
 * Returned data is intentionally minimal (currently only the title) to
 * avoid leaking potentially sensitive chat content or internal fields
 * through unauthorized access attempts.
 *
 * SECURITY MODEL
 *  - Authorization is owner-based: a chat is accessible only when
 *    `signedInUserId === ownerUserId` as evaluated by `isUserAuthorized`.
 *  - If the user is not authorized or the chat does not exist the function
 *    returns `{ ok: false }` without throwing, enabling simple branch
 *    handling in calling server components / route handlers.
 *
 * DESIGN NOTES
 *  - Returns a discriminated union-ish shape (`ok: true|false`) instead of
 *    throwing on not-found/unauthorized to keep UI logic straightforward.
 *  - Omits `title` when empty/null by converting to `undefined` so callers
 *    can rely on simple truthiness checks for display logic or fallbacks.
 *
 * EXTENSIBILITY
 *  To expose more public metadata, append fields inside the `columns`
 *  selection and the returned object under the authorized branch—preserving
 *  the guard so unauthorized requests still receive only `{ ok: false }`.
 */
import { drizDbWithInit } from '@compliance-theater/database/orm';
import { isUserAuthorized } from '@/lib/site-util/auth';

/**
 * Fetch chat metadata (currently title) if the requesting user owns the chat.
 *
 * @param params.chatId Unique identifier of the chat record.
 * @param params.userId Authenticated (signed-in) user ID performing the request.
 * @returns An object:
 *  - `{ ok: true, title?: string }` when the chat exists and user is authorized.
 *  - `{ ok: false }` when chat missing or unauthorized.
 *
 * @example
 * ```ts
 * const details = await getChatDetails({ chatId: 'abc123', userId: 42 });
 * if (details.ok) {
 *   console.log(details.title ?? '(untitled)');
 * } else {
 *   // handle not-found or unauthorized
 * }
 * ```
 */
export const getChatDetails = async ({
  chatId,
  userId,
}: {
  chatId: string;
  userId: number;
}) => {
  const chat = await drizDbWithInit((db) =>
    db.query.chats.findFirst({
      columns: {
        id: true,
        userId: true,
        title: true,
      },
      where: (chat, { eq }) => eq(chat.id, chatId),
    }),
  );
  return chat &&
    (await isUserAuthorized({
      signedInUserId: userId,
      ownerUserId: chat.userId,
    }))
    ? {
        ok: true,
        title: !chat.title ? undefined : chat.title,
      }
    : {
        ok: false,
      };
};
