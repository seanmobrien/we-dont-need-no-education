import { LoggedError } from '@compliance-theater/logger';
import { signData } from '@/lib/site-util/auth/user-keys';
export const signResponse = async (source) => {
    try {
        const message = `${source.callId}:${source.choice}`;
        const hash = await signData(message);
        return { ...source, hash };
    }
    catch (error) {
        LoggedError.isTurtlesAllTheWayDownBaby(error, {
            log: true,
            source: 'signResponse',
        });
        const fallbackHash = btoa(`${source.callId}:${source.choice}:${Date.now()}`);
        return { ...source, hash: fallbackHash };
    }
};
//# sourceMappingURL=confirmation.js.map