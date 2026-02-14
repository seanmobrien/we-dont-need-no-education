import { ImpersonationThirdParty } from './impersonation.thirdparty';
import { ImpersonationServiceCache } from './impersonation-service-cache';
import { auth } from '@/auth';
import { log } from '@compliance-theater/logger';
export const fromRequest = async ({ audience, } = {}) => {
    const session = await auth();
    if (!session?.user) {
        log((l) => l.warn('Impersonation requested without an active user session'));
        return undefined;
    }
    return ImpersonationThirdParty.fromUser({ user: session.user, audience });
};
export const fromUserId = async ({ user, audience, }) => {
    if (!user || !user.id) {
        log((l) => l.warn('Impersonation requested without a userId'));
        return undefined;
    }
    const cache = ImpersonationServiceCache.getInstance();
    return cache.getOrCreate(user.id, audience, async () => {
        const service = await ImpersonationThirdParty.fromUser({
            user,
            audience,
        });
        if (!service) {
            throw new Error('Failed to create impersonation service');
        }
        return service;
    });
};
export const forAdmin = () => ImpersonationThirdParty.forAdmin();
//# sourceMappingURL=impersonation-factory.js.map