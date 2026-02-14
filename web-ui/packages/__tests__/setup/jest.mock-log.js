const logSymbol = Symbol.for('@tests/logger-instance');
const getLogger = () => {
    const globalWithLogger = globalThis;
    if (!globalWithLogger[logSymbol]) {
        const makeMockImplementation = (name) => {
            return (...args) => () => { };
        };
        globalWithLogger[logSymbol] = {
            warn: jest.fn(makeMockImplementation('warn')),
            error: jest.fn(makeMockImplementation('error')),
            info: jest.fn(makeMockImplementation('info')),
            debug: jest.fn(makeMockImplementation('debug')),
            silly: jest.fn(makeMockImplementation('silly')),
            verbose: jest.fn(makeMockImplementation('verbose')),
            log: jest.fn(makeMockImplementation('log')),
            trace: jest.fn(makeMockImplementation('trace')),
        };
    }
    return globalWithLogger[logSymbol];
};
let internalLog = undefined;
let internalLogger = undefined;
jest.mock('@compliance-theater/logger/core', () => {
    return {
        get logger() {
            if (!internalLogger) {
                internalLogger = jest.fn(() => Promise.resolve(getLogger()));
            }
            return internalLogger;
        },
        get log() {
            internalLog = internalLog ?? jest.fn((cb) => {
                cb(getLogger());
            });
            return internalLog;
        },
        logEvent: jest.fn(() => Promise.resolve()),
    };
});
jest.mock('@compliance-theater/logger', () => {
    const originalModule = jest.requireActual('@compliance-theater/logger');
    const LoggedErrorWithSpies = originalModule.LoggedError;
    jest.spyOn(LoggedErrorWithSpies, 'subscribeToErrorReports');
    jest.spyOn(LoggedErrorWithSpies, 'unsubscribeFromErrorReports');
    jest.spyOn(LoggedErrorWithSpies, 'clearErrorReportSubscriptions');
    jest.spyOn(LoggedErrorWithSpies, 'isLoggedError');
    jest.spyOn(LoggedErrorWithSpies, 'buildMessage');
    jest.spyOn(LoggedErrorWithSpies, 'isTurtlesAllTheWayDownBaby');
    return {
        ...originalModule,
        logEvent: jest.fn(() => Promise.resolve()),
        get logger() {
            if (!internalLogger) {
                internalLogger = jest.fn(() => Promise.resolve(getLogger()));
            }
            return internalLogger;
        },
        get log() {
            internalLog = internalLog ?? jest.fn((cb) => {
                cb(getLogger());
            });
            return internalLog;
        },
        errorLogFactory: jest.fn((x) => x),
        simpleScopedLogger: jest.fn(() => getLogger()),
        LoggedError: LoggedErrorWithSpies
    };
});
import { withJestTestExtensions } from '../jest.test-extensions';
let emitWarningMock;
const mockEmitWarningImpl = (message, options) => {
    if (withJestTestExtensions().suppressDeprecation) {
        return;
    }
    console.warn(message, options);
};
beforeEach(() => {
    if (typeof process !== 'undefined' &&
        typeof process.emitWarning === 'function') {
        emitWarningMock = jest.spyOn(process, 'emitWarning');
        emitWarningMock.mockImplementation(mockEmitWarningImpl);
    }
});
afterEach(() => {
    if (emitWarningMock) {
        emitWarningMock.mockRestore();
        emitWarningMock = undefined;
    }
});
//# sourceMappingURL=jest.mock-log.js.map