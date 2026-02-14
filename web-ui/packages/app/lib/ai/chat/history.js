import { drizDbWithInit } from '@compliance-theater/database/orm';
import { isUserAuthorized } from '@/lib/site-util/auth';
export const getChatDetails = async ({ chatId, userId, }) => {
    const chat = await drizDbWithInit((db) => db.query.chats.findFirst({
        columns: {
            id: true,
            userId: true,
            title: true,
        },
        where: (chat, { eq }) => eq(chat.id, chatId),
    }));
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
//# sourceMappingURL=history.js.map