export interface ModelStat {
  id: string;
  modelName: string;
  displayName: string;
  description: string;
  isActive: boolean;
  providerId: string;
  providerName: string;
  providerDisplayName: string;
  maxTokensPerMessage: number;
  maxTokensPerMinute: number;
  maxTokensPerDay: number;
  modelKey: string;
  available: boolean;
  stats: {
    minute: TokenStats;
    hour: TokenStats;
    day: TokenStats;
  };
}

export interface TokenStats {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  requestCount: number;
}

export interface QueueRequest {
  id: string;
  modelClassification: string;
  request: {
    params: Record<string, unknown>;
    messages: Array<{ role?: string; content?: string }>;
  };
  metadata: {
    submittedAt: string;
    generation: 1 | 2;
    chatHistoryId?: string;
    userId?: string;
  };
  queueTime: number;
  tokenEstimate?: number;
}

export interface QueueGenerationStats {
  size: number;
  requests: QueueRequest[];
  oldestRequest?: Date;
  newestRequest?: Date;
  averageSize: number;
  largestRequest?: QueueRequest;
}

export interface QueueInfo {
  classification: string;
  queues: {
    generation1: QueueGenerationStats;
    generation2: QueueGenerationStats;
  };
  totalPending: number;
}

export interface QueueSummary {
  totalPending: number;
  totalGen1: number;
  totalGen2: number;
}

export interface StatisticsData {
  models: ModelStat[];
  queues: {
    summary: QueueSummary;
    queues: QueueInfo[];
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  timestamp?: string;
}