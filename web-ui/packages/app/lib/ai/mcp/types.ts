import type {
  ToolSet,
} from 'ai';
import type { ImpersonationService } from '@compliance-theater/auth/lib/impersonation';
import type { Request } from '@modelcontextprotocol/sdk/types.js';
import type {
  experimental_MCPClient as MCPClient,
  experimental_MCPClientConfig as MCPClientConfig
} from '@ai-sdk/mcp';

export type {
  MCPClient,
  MCPClientConfig
};

export type ToolProviderFactoryOptions = {
  url: string;
  headers?: () => Promise<Record<string, string>>;
  allowWrite?: boolean;
  req?: Request;
  impersonation?: ImpersonationService;
  sse?: boolean;
  onUncaughtError?: (error: unknown) => void;
};

export type ConnectableToolProvider = {
  get_mcpClient: () => MCPClient;
  get_isConnected: () => boolean;
  readonly tools: ToolSet;
  [Symbol.dispose]: () => void;
  addDisposeListener: (listener: () => void) => void;
  removeDisposeListener: (listener: () => void) => void;
  connect: ({ }: { allowWrite?: boolean }) => Promise<ConnectableToolProvider>;
};

export type ToolProviderSet = {
  readonly isHealthy: boolean;
  readonly tools: ToolSet;
  providers: Array<ConnectableToolProvider>;
  [Symbol.dispose]: () => void;
  addDisposeListener: (listener: () => void) => void;
  removeDisposeListener: (listener: () => void) => void;
  /**
   * Disposes of the tool provider set and all its providers.
   * @deprecated Use [Symbol.dispose] instead
   * @returns A promise that resolves when disposal is complete
   */
  dispose: () => Promise<void>;
};

export type CachedToolProvider = {
  toolProviders: ToolProviderSet;
  lastAccessed: number;
  userId: string;
  sessionId: string;
};

export type UserToolProviderCacheConfig = {
  /** Maximum number of cached tool providers per user */
  maxEntriesPerUser: number;
  /** Maximum total entries across all users */
  maxTotalEntries: number;
  /** Time to live in milliseconds */
  ttl: number;
  /** Cleanup interval in milliseconds */
  cleanupInterval: number;
};

export type UserToolProviderCache = {
  getOrCreate(
    userId: string,
    sessionId: string,
    config: {
      writeEnabled: boolean;
      memoryDisabled: boolean;
      headers?: Record<string, string>;
    },
    factory: () => Promise<ToolProviderSet>,
  ): Promise<ToolProviderSet>;
  invalidateUser(userId: string): void;
  invalidateSession(userId: string, sessionId: string): void;
  clear(): void;
  getStats(): {
    totalEntries: number;
    userCounts: Record<string, number>;
    config: UserToolProviderCacheConfig;
  };
  shutdown(): void;
};

export type MCPErrorOptions = {
  code: number;
  message?: string;
  data?: unknown;
};
