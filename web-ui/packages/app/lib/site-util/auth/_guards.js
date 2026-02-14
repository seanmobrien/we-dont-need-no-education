export const isSessionExt = (session) => {
    return (!!session &&
        typeof session === 'object' &&
        'server' in session &&
        typeof session.server === 'object' &&
        session.server !== null &&
        'tokens' in session.server &&
        typeof session.server.tokens === 'object' &&
        session.server.tokens !== null);
};
//# sourceMappingURL=_guards.js.map