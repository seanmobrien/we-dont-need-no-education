const mockGtag = jest.fn();
Object.defineProperty(window, 'gtag', {
    value: mockGtag,
    writable: true,
});
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
});
const mockConsoleError = jest
    .spyOn(console, 'error')
    .mockImplementation(() => { });
const mockConsoleGroup = jest
    .spyOn(console, 'group')
    .mockImplementation(() => { });
const mockConsoleGroupEnd = jest
    .spyOn(console, 'groupEnd')
    .mockImplementation(() => { });
const mockConsoleTable = jest
    .spyOn(console, 'table')
    .mockImplementation(() => { });
describe('ErrorReporter', () => {
    let errorReporter;
    it('fix these later', () => { });
});
export {};
//# sourceMappingURL=error-reporter.test.js.map