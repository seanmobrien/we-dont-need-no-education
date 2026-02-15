import { ImpersonationService } from '@compliance-theater/auth/lib/impersonation';
import { ToolProviderSet } from '../../mcp';
import { MemoryClient } from '../../mem0';
import { LanguageModelV2CallOptions, LanguageModelV2Middleware, LanguageModelV2Content } from '@ai-sdk/provider';

export type DoGenerateResult = Awaited<ReturnType<Required<LanguageModelV2Middleware>['wrapGenerate']>>;

export type MemoryMiddlewareContext = {
  memClient: MemoryClient | undefined;
  impersonation: ImpersonationService | undefined;
  projectId: string | undefined;
  organizationId: string | undefined;
  mem0Enabled: boolean | undefined;
  directAccess: boolean | undefined;
  userId: string | undefined;
  chatId: string;
  messageId: string;
  memoryInsertSlot?: number;
  toolProviders?: ToolProviderSet;
};

export type MemoryMiddlewareAugmentationStrategy = {
  transformParams: (props: { params: LanguageModelV2CallOptions; context: MemoryMiddlewareContext; }) => Promise<LanguageModelV2CallOptions>;
  onOutputGenerated: (props: { output: Array<LanguageModelV2Content>; params: LanguageModelV2CallOptions; context: MemoryMiddlewareContext; }) => Promise<boolean>;
};

export type StrategyFactory = (props: {
  strategyFactory: StrategyFactory;
  context: MemoryMiddlewareContext;
}) => Array<[string, MemoryMiddlewareAugmentationStrategy]>;

export type MemoryMiddlewareOptions = {
  projectId?: string;
  orgId?: string;
  impersonation?: ImpersonationService;
  mem0Enabled?: boolean;
  directAccess?: boolean;
  userId: string | undefined;
  chatId: string;
  messageId: string;
  toolProviders?: ToolProviderSet;
  strategyFactory?: StrategyFactory;
};



