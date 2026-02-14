const makeMockImplementation = (name) => {
    return (...args) => console.log(`logger::${name} called with `, args);
};
export const logger = () => ({
    warn: jest.fn(makeMockImplementation('warn')),
    error: jest.fn(makeMockImplementation('error')),
    info: jest.fn(makeMockImplementation('info')),
    debug: jest.fn(makeMockImplementation('debug')),
    silly: jest.fn(makeMockImplementation('silly')),
    verbose: jest.fn(makeMockImplementation('verbose')),
    log: jest.fn(makeMockImplementation('log')),
});
export const log = jest.fn((cb) => cb(logger()));
//# sourceMappingURL=logger.js.map