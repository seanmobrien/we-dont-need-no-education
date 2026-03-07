import type { EnhancedFetchConfigTimeout } from './fetch-types';

export type EnhancedFetchConfig = {
    timeout: EnhancedFetchConfigTimeout;
};

export const DEFAULT_ENHANCED_FETCH_CONFIG: EnhancedFetchConfig = {
    timeout: {
        lookup: 200,
        connect: 1000,
        secureConnect: 1000,
        socket: 60000,
        send: 10000,
        response: 30000,
        request: 60000,
    },
};
