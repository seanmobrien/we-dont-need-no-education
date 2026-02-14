export class InvalidGrantError extends Error {
    constructor(error, ops) {
        if (typeof error === 'string') {
            super(error);
        }
        else {
            super(error.message, {
                ...(ops ?? {}),
                cause: error
            });
        }
        this.name = 'InvalidGrantError';
    }
}
//# sourceMappingURL=errors.js.map