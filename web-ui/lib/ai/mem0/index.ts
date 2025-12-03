import { MemoryClient } from './lib/client/mem0';

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
  AllUsers,
  User,
  FeedbackPayload,
  Feedback,
} from './lib/client/mem0.types';

export type {
  Mem0Info,
  AuthServiceHealth,
  HealthDetails,
  MemoryHealthCheckResponse,
  HealthCheckParams,
  HealthStatus,
} from './types/health-check';

// Export the main client
export { MemoryClient };

export { memoryClientFactory } from './memoryclient-factory';

// Export health check types and functions
export { determineHealthStatus } from './lib/health-check';
