import { Dispatch, SetStateAction } from "react";
import type { DatabaseMockType } from "./jest.mock-drizzle";

type SymbolKey = string | symbol;
const testMessages: string[] = [];

const addTestMessage = (message: string) => {
  if (!testMessages.includes(message)) {
    testMessages.push(message);
  }
};

type DockPosition =
  | 'inline' // Default inline position
  | 'floating' // Floating dialog
  | 'docked'
  ;

type ChatConfigType = {
  position: DockPosition;
  size: {
    width: number;
    height: number;
  };
  // For docked panels, this represents the panel size along the docked edge
  dockSize?: number;
};

type ChatPanelContextType = {
  config: ChatConfigType;
  setPosition: (position: SetStateAction<DockPosition>) => void;
  setSize: (width: number, height: number) => void;
  setDockSize: (size: SetStateAction<number | undefined>) => void;
  setFloating: (isFloating: SetStateAction<boolean>) => void;
  setCaseFileId: Dispatch<SetStateAction<string | null>>;
  isDocked: boolean;
  isFloating: boolean;
  isInline: boolean;
  caseFileId: string | null; // ID of the active case file, if any
  debounced: {
    setSize: (width: number, height: number) => Promise<void>;
  };
  dockPanel: HTMLDivElement | null;
  setDockPanel: (panel: HTMLDivElement | null) => void;
  lastCompletionTime: Date | null;
  setLastCompletionTime: Dispatch<SetStateAction<Date | null>>;
};
type ChatPanelContextState = Pick<ChatPanelContextType, 'config' | 'isDocked' | 'isFloating' | 'isInline' | 'caseFileId' | 'lastCompletionTime' | 'dockPanel'>;

const chatPanelContextFactory = () => {
  const config: ChatConfigType = {
    position: 'inline',
    size: {
      width: 400,
      height: 600,
    },
    dockSize: undefined,
  };

  const makeConfigStateUpdater = <TKey extends keyof ChatConfigType>(key: TKey) => {
    return jest.fn((value: SetStateAction<Pick<ChatConfigType, TKey>[TKey]>) => {
      if (typeof value === 'function') {
        config[key] = value(config[key]);
      } else {
        config[key] = value;
      }
    });
  };
  const makeStateUpdater = <TKey extends keyof ChatPanelContextState>(key: TKey) => {
    return jest.fn((value: SetStateAction<Pick<ChatPanelContextState, TKey>[TKey]>) => {
      if (typeof value === 'function') {
        (thisState as ChatPanelContextState)[key] = value(thisState[key] as Pick<ChatPanelContextState, TKey>[TKey]);
      } else {
        (thisState as ChatPanelContextState)[key] = value;
      }
    });
  };
  const setSize = jest.fn((width: number, height: number) => {
    config.size = { width, height };
  });
  const thisState: ChatPanelContextType = {
    isDocked: false,
    isFloating: false,
    isInline: true,
    config,
    setPosition: makeConfigStateUpdater('position'),
    setSize,
    setDockSize: makeConfigStateUpdater('dockSize'),
    setFloating: jest.fn((isFloating: SetStateAction<boolean>) => {
      if (typeof isFloating === 'function') {
        thisState.isFloating = isFloating(thisState.isFloating);
      } else {
        thisState.isFloating = isFloating;
      }
      config.position = thisState.isFloating ? 'floating' : 'inline';
    }),
    setCaseFileId: makeStateUpdater('caseFileId'),
    caseFileId: null,
    debounced: {
      setSize: jest.fn((width: number, height: number) => {
        setSize(width, height);
        return Promise.resolve();
      }),
    },
    dockPanel: null,
    setDockPanel: makeStateUpdater('dockPanel'),
    lastCompletionTime: null,
    setLastCompletionTime: makeStateUpdater('lastCompletionTime'),
  };
  return thisState;
}

const testExtensionFactory = () => {
  return {
    chatPanelContext: chatPanelContextFactory(),
    session: {
      id: 'test-session-id',
      user: {
        id: '123',
        name: 'Test User',
        email: 'test-user@example.com',
        subject: 'test-keycloak-uid',
        image: 'test-image-url',
      },
      expires: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
    },
    makeMockDb: () => {
      return undefined as unknown as DatabaseMockType;
    },
    suppressDeprecation: false,
    singletonStore: new Map<SymbolKey, unknown>(),
    addTestMessage,
    addMockWarning: (module: string) => {
      addTestMessage(`WARNING: Module ${module} is not available for mocking at this time.`)
    }
  };
};

type JestTestExtensions = {
  session: {
    id: string;
    user: {
      id: string;
      name: string;
      email: string;
      subject: string;
      image?: string;
    };
    expires: string;
  } | null;
  chatPanelContext: {
    isDocked: boolean;
    isFloating: boolean;
    isInline: boolean;
    config: {
      position: 'inline' | 'docked' | 'floating';
    };
  };
  mockServices: Record<string, unknown>;
  makeMockDb: () => DatabaseMockType;
  suppressDeprecation: boolean;
  singletonStore: Map<SymbolKey, unknown>;
  addMockWarning: (message: string) => void;
  addTestMessage: (message: string) => void;
};

const TEST_EXTENSIONS = Symbol.for('@noeducation/jest/extensions');

type GlobalWithJestExtensions = {
  [TEST_EXTENSIONS]?: JestTestExtensions;
};

export const withJestTestExtensions = (): JestTestExtensions => {
  const withExtensions = globalThis as GlobalWithJestExtensions;
  if (!withExtensions[TEST_EXTENSIONS]) {
    withExtensions[TEST_EXTENSIONS] = testExtensionFactory();
  }
  return withExtensions[TEST_EXTENSIONS];
};

// Ensure valid state before each test
beforeEach(() => {
  withJestTestExtensions();
});
// Clear out state after each test
afterEach(() => {
  const withExtensions = globalThis as GlobalWithJestExtensions;
  delete withExtensions[TEST_EXTENSIONS];
  withExtensions[TEST_EXTENSIONS] = undefined;
});

/* No dependency mock warnings outputed for now
afterAll(() => {
if (testMessages.length > 0) {
  console.log(`Test Messages:\n\t${testMessages.join('\n\t')}`);
}
testMessages.length = 0; // Clear messages after logging
});
*/

