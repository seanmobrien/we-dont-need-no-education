/**
 * Test utilities for feature-flags package tests
 */

export interface MockedConsole {
  error?: jest.SpyInstance;
  log?: jest.SpyInstance;
  group?: jest.SpyInstance;
  groupEnd?: jest.SpyInstance;
  table?: jest.SpyInstance;
  info?: jest.SpyInstance;
  warn?: jest.SpyInstance;
  setup: () => void;
  dispose: () => void;
}

let lastMockedConsole: MockedConsole | undefined;

export const hideConsoleOutput = () => {
  if (lastMockedConsole) {
    return lastMockedConsole;
  }
  const ret: MockedConsole = {
    error: undefined,
    log: undefined,
    group: undefined,
    groupEnd: undefined,
    table: undefined,
    info: undefined,
    warn: undefined,
    setup: () => {
      ret.error ??= jest.spyOn(console, 'error').mockImplementation(() => {});
      ret.log ??= jest.spyOn(console, 'log').mockImplementation(() => {});
      ret.group ??= jest.spyOn(console, 'group').mockImplementation(() => {});
      ret.groupEnd ??= jest
        .spyOn(console, 'groupEnd')
        .mockImplementation(() => {});
      ret.table ??= jest.spyOn(console, 'table').mockImplementation(() => {});
      ret.info ??= jest.spyOn(console, 'info').mockImplementation(() => {});
      ret.warn ??= jest.spyOn(console, 'warn').mockImplementation(() => {});
    },
    dispose: () => {
      ret.error?.mockRestore();
      ret.log?.mockRestore();
      ret.group?.mockRestore();
      ret.groupEnd?.mockRestore();
      ret.table?.mockRestore();
      ret.info?.mockRestore();
      ret.warn?.mockRestore();
      lastMockedConsole = undefined;
    },
  };
  lastMockedConsole = ret;
  return ret;
};
