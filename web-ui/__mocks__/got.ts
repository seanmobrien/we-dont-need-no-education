import { mockDeep } from 'jest-mock-extended';
import type { Got } from 'got';
// import * as originalGot from 'got';
// Load the real module so non-mocked exports can fall back to the original behavior
// const originalGot = jest.requireActual('got');

// Create a deep mock for the `got` function / instance. Tests can configure
// the mock via jest.fn()/mockResolvedValue etc.
const mockedGot = mockDeep<Got>();
const got = mockedGot as Got;

// For now have extend loop back in on iteself - simplifies mocking and in-test validation
// mockedGot.extend.mockReturnValue(got);
// Re-export original module properties so any other named exports (errors, helpers)
// fall back to the real module. Override `got` and the default export with the mock.
module.exports = {
  got: got as Got,
  default: got as Got,
};

mockedGot.extend.mockReturnValue(got);
/*
beforeEach(() => {
});

afterEach(() => {
  // Explicitly clear all mocks associated with got

  Object.keys(mockedGot).forEach((key) => {
    const val = mockedGot[key as keyof typeof mockedGot];
    if (val && typeof val === 'function' && val.mockClear) {
      val.mockClear();
    }
    if (key === 'extend' && typeof val === 'function') {
      // Also clear mocks on the extended instance
      const extended = (val as Got['extend'])();
      Object.keys(extended).forEach((extKey) => {
        const extVal = extended[extKey as keyof typeof extended];
        if (
          extVal &&
          typeof extVal === 'function' &&
          'mockClear' in extVal &&
          typeof extVal.mockClear === 'function'
        ) {
          extVal.mockClear();
        }
      });
    }
  });
});
*/
/*
// also provide ESM named exports for TypeScript consumers
export { got };
export default got;
*/
