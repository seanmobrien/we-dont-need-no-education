export type MockedConsole = {
  error?: jest.SpyInstance;
  log?: jest.SpyInstance;
  info?: jest.SpyInstance;
  group?: jest.SpyInstance;
  groupEnd?: jest.SpyInstance;
  table?: jest.SpyInstance;
  warn?: jest.SpyInstance;
  setup: () => void;
  dispose: () => void;
  [Symbol.dispose]: () => void;
};

let lastMockedConsole: MockedConsole | undefined = undefined;

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
      ret[Symbol.dispose]();
    },
    [Symbol.dispose]: () => {
      ret.error?.mockRestore();
      delete ret.error;
      ret.log?.mockRestore();
      delete ret.log;
      ret.group?.mockRestore();
      delete ret.group;
      ret.groupEnd?.mockRestore();
      delete ret.groupEnd;
      ret.table?.mockRestore();
      delete ret.table;
      ret.info?.mockRestore();
      delete ret.info;
      ret.warn?.mockRestore();
      delete ret.warn;
    },
  };
  lastMockedConsole = ret;
  return ret;
};
afterEach(() => {
  if (lastMockedConsole) {
    lastMockedConsole.dispose();
    lastMockedConsole = undefined;
  }
});
