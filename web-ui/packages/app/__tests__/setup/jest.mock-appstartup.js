jest.mock('@/lib/site-util/app-startup', () => {
    const startup = jest.fn(() => {
        if (ret._currentState === 'pending' || ret._currentState === 'initializing') {
            ret._currentState = 'ready';
        }
        return Promise.resolve(ret._currentState);
    });
    const state = jest.fn(() => ret._currentState);
    const ret = ({
        _currentState: 'pending',
        startup,
        state,
    });
    return ret;
});
export {};
//# sourceMappingURL=jest.mock-appstartup.js.map