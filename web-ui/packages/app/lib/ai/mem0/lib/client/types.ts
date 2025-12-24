import { MemoryAddEvent, Memory, MemoryState } from './mem0.types';

// Re-export all types from mem0.types
export type {
  MemoryOptions,
  ProjectOptions,
  Memory,
  MemoryHistory,
  MemoryUpdateBody,
  ProjectResponse,
  PromptUpdatePayload,
  SearchOptions,
  Webhook,
  WebhookPayload,
  Messages,
  Message,
  MemoryState,
  AllUsers,
  User,
  FeedbackPayload,
  Feedback,
} from './mem0.types';

export {
  MemoryStateValues
} from './mem0.types';

export type MemoryClientFactoryOptions = {

};

export type ProcessedMemoryAdd = {
  id: string;
  event: MemoryAddEvent;
} & (
    {
      not_found?: never | false | undefined;
      memory: Memory;
      state: MemoryState;
    } | {
      not_found: true;
    }
  );
