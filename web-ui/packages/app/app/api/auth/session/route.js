import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { getActiveUserPublicKeys } from '@/lib/site-util/auth/user-keys-server';
import { isSessionActive } from '@/lib/site-util/auth';
export const dynamic = 'force-dynamic';
export const GET = async (req) => {
    const { nextUrl } = req;
    const session = await auth();
    const isActiveSession = isSessionActive({ session });
    let keys = undefined;
    if (isActiveSession && nextUrl) {
        const getKeys = nextUrl.searchParams.get('get-keys');
        if (getKeys && session?.user?.id) {
            const userId = typeof session.user.id === 'number'
                ? session.user.id
                : parseInt(session.user.id, 10);
            if (!isNaN(userId)) {
                keys = await getActiveUserPublicKeys({ userId });
            }
        }
    }
    return NextResponse.json({
        status: isActiveSession ? 'authenticated' : 'unauthenticated',
        data: session ?? null,
        publicKeys: keys,
    });
};
//# sourceMappingURL=route.js.map