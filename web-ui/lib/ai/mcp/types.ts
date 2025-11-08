import { UnwrapPromise } from '@/lib/typescript';
import type {
  experimental_createMCPClient as createMCPClient,
  ToolSet,
} from 'ai';
import type { ImpersonationService } from '@/lib/auth/impersonation';

export type MCPClient = UnwrapPromise<ReturnType<typeof createMCPClient>>;

export type ToolProviderFactoryOptions = {
  url: string;
  headers?: () => Promise<Record<string, string>>;
  allowWrite?: boolean;
  req?: Request;
  impersonation?: ImpersonationService;
  sse?: boolean;
};

export type ConnectableToolProvider = {
  get_mcpClient: () => MCPClient;
  get_isConnected: () => boolean;
  readonly tools: ToolSet;
  dispose: () => Promise<void>;
  connect: ({}: { allowWrite?: boolean }) => Promise<ConnectableToolProvider>;
};

export type ToolProviderSet = {
  readonly isHealthy: boolean;
  readonly tools: ToolSet;
  providers: Array<ConnectableToolProvider>;
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
