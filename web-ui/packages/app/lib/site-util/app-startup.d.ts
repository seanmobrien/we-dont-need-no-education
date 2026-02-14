type AppStartupState = 'pending' | 'initializing' | 'ready' | 'teardown' | 'done';
export declare const startup: () => Promise<AppStartupState>;
export declare const state: () => AppStartupState;
export {};
//# sourceMappingURL=app-startup.d.ts.map