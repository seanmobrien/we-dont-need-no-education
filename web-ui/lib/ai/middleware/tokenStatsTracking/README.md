# Token Consumption Statistics and Quota Management

This document describes the new token consumption statistics tracking and quota management system implemented for AI model usage.

## Overview

The token statistics tracking system provides:
- Real-time token usage tracking per model/provider combination
- Sliding window statistics (minute, hour, day)
- Configurable quota enforcement (per-message, per-minute, per-day limits)
- Redis caching for fast access to current stats
- PostgreSQL persistence as the system of record for quota configuration

## Database Schema

### `model_quotas` Table

Stores quota configuration for each model/provider combination:

```sql
CREATE TABLE model_quotas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider TEXT NOT NULL,                    -- 'azure', 'google', etc.
    model_name TEXT NOT NULL,                  -- 'hifi', 'lofi', 'gemini-pro', etc.
    max_tokens_per_message INTEGER,            -- Per-message limit
    max_tokens_per_minute INTEGER,             -- Rate limit (tokens/minute)
    max_tokens_per_day INTEGER,                -- Daily quota
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    UNIQUE(provider, model_name)
);
```

### `token_consumption_stats` Table

Stores aggregated token consumption statistics:

```sql
CREATE TABLE token_consumption_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider TEXT NOT NULL,
    model_name TEXT NOT NULL,
    window_start TIMESTAMPTZ NOT NULL,         -- Start of time window
    window_end TIMESTAMPTZ NOT NULL,           -- End of time window
    window_type TEXT NOT NULL,                 -- 'minute', 'hour', 'day'
    prompt_tokens INTEGER DEFAULT 0 NOT NULL,
    completion_tokens INTEGER DEFAULT 0 NOT NULL,
    total_tokens INTEGER DEFAULT 0 NOT NULL,
    request_count INTEGER DEFAULT 0 NOT NULL,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(provider, model_name, window_start, window_type)
);
```

## Usage Examples

### Basic Token Tracking (Logging Only)

```typescript
import { tokenStatsMiddleware } from '@/lib/ai/middleware/tokenStatsTracking';
import { wrapLanguageModel } from 'ai';

const model = wrapLanguageModel({
  model: baseModel,
  middleware: tokenStatsMiddleware({
    provider: 'azure',
    modelName: 'hifi',
    enableLogging: true,
    enableQuotaEnforcement: false
  })
});
```

### Token Tracking with Quota Enforcement

```typescript
import { tokenStatsWithQuotaMiddleware } from '@/lib/ai/middleware/tokenStatsTracking';

const model = wrapLanguageModel({
  model: baseModel,
  middleware: tokenStatsWithQuotaMiddleware({
    provider: 'azure',
    modelName: 'hifi',
    enableLogging: true
  })
});
```

### Direct Service Usage

```typescript
import { tokenStatsService } from '@/lib/ai/middleware/tokenStatsTracking';

// Check quota before making a request
const quotaCheck = await tokenStatsService.checkQuota('azure', 'hifi', 1000);
if (!quotaCheck.allowed) {
  throw new Error(`Quota exceeded: ${quotaCheck.reason}`);
}

// Record usage after a successful request
await tokenStatsService.safeRecordTokenUsage('azure', 'hifi', {
  promptTokens: 100,
  completionTokens: 200,
  totalTokens: 300
});

// Get current statistics
const stats = await tokenStatsService.getTokenStats('azure', 'hifi');
console.log(`Current minute usage: ${stats.currentMinuteTokens}`);

// Get comprehensive usage report
const report = await tokenStatsService.getUsageReport('azure', 'hifi');
console.log('Quota:', report.quota);
console.log('Current stats:', report.currentStats);
console.log('Quota check:', report.quotaCheckResult);
```

## Configuration

### Setting Up Model Quotas

Insert quota configurations into the `model_quotas` table:

```sql
-- Azure GPT-4 limits
INSERT INTO model_quotas (provider, model_name, max_tokens_per_message, max_tokens_per_minute, max_tokens_per_day)
VALUES ('azure', 'hifi', 4000, 10000, 100000);

-- Google Gemini limits  
INSERT INTO model_quotas (provider, model_name, max_tokens_per_message, max_tokens_per_minute, max_tokens_per_day)
VALUES ('google', 'gemini-pro', 2000, 5000, 50000);
```

### Redis Key Structure

The system uses the following Redis key patterns:

- **Quota cache**: `token_quota:{provider}:{model_name}`
- **Statistics**: `token_stats:{provider}:{model_name}:{window_type}`

Where:
- `{provider}`: Provider name (e.g., 'azure', 'google')
- `{model_name}`: Model name (e.g., 'hifi', 'gemini-pro')
- `{window_type}`: Time window ('minute', 'hour', 'day')

## Error Handling

The system is designed to "fail open" - if quota checking fails due to Redis/database issues, requests are allowed to proceed. This ensures that temporary infrastructure issues don't block legitimate AI model usage.

Quota violations throw errors with detailed information:

```typescript
try {
  await model.generateText({ prompt: "Hello" });
} catch (error) {
  if (error.message.startsWith('Quota exceeded:')) {
    console.log('Quota info:', error.quotaInfo);
    // Handle quota violation
  }
}
```

## Performance Considerations

- **Redis caching**: Quota configurations are cached in Redis for 5 minutes
- **Memory caching**: Service maintains in-memory quota cache with 5-minute TTL
- **Asynchronous recording**: Token usage recording happens asynchronously to avoid blocking responses
- **Sliding windows**: Time windows are aligned to minute/hour/day boundaries for efficient aggregation

## Integration with Existing Infrastructure

The token tracking system integrates seamlessly with the existing AI infrastructure:

- **Middleware pattern**: Uses the same middleware pattern as existing `cacheWithRedis`
- **Redis client**: Reuses the existing Redis client infrastructure
- **Drizzle ORM**: Uses existing Drizzle database connection and schema patterns
- **Logging**: Integrates with existing logging infrastructure
- **Provider/model identification**: Leverages existing provider:model naming from `aiModelFactory`

## Monitoring and Observability

The system provides comprehensive logging at different levels:

- **Debug logs**: Quota checks, token recording operations
- **Warning logs**: Quota violations, blocked requests
- **Error logs**: Infrastructure failures, quota check errors

All logs include structured data for monitoring and alerting:

```typescript
{
  provider: 'azure',
  modelName: 'hifi',
  reason: 'Request would exceed per-minute limit (10000)',
  currentUsage: {
    currentMinuteTokens: 9500,
    lastHourTokens: 45000,
    last24HoursTokens: 85000,
    requestCount: 150
  }
}
```