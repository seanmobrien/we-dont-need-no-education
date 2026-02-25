
export const isRunningOnServer = (): boolean =>
    process.env && process.env.NEXT_RUNTIME === 'nodejs';

export const isRunningOnEdge = (): boolean =>
    process.env && process.env.NEXT_RUNTIME === 'edge';

export const isRunningOnClient = (): boolean =>
    typeof window !== 'undefined' && !isRunningOnEdge();
