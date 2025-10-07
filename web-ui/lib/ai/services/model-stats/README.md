# Model Stats Services

This directory contains services for managing AI model configurations, provider mappings, and usage statistics.

## Overview

The Model Stats services provide centralized management of:

- AI model configurations and metadata
- Provider name/ID normalization and mapping
- Model quota management and enforcement
- Token usage statistics and monitoring

## Architecture

```mermaid
graph TD
    A[ModelMap] --> B[Database]
    A --> C[ProviderMap]
    D[TokenStatsService] --> A
    E[AI Middleware] --> D
    F[LanguageModel--> A

    subgraph "Database Schema"
        B --> G[models table]
        B --> H[modelQuotas table]
        B --> I[providers table]
    end
```

## Components

### ModelMap (`model-map.ts`)

Primary service for model configuration management. Features:

- **Singleton Pattern**: Single instance with lazy initialization
- **Database Integration**: Loads model and quota data from PostgreSQL
- **Local Caching**: 5-minute TTL cache for performance
- **Provider/Model Normalization**: Handles various provider:model formats
- **LanguageModelntegration**: Direct lookup from AI SDK model instances
- **Comprehensive Quota Management**: Links models to usage quotas

#### Key Methods

```typescript
// Get singleton instance
const modelMap = await ModelMap.getInstance();

// Find model by provider and name
const model = await modelMap.getModelByProviderAndName(
  'azure-openai.chat',
  'gpt-4',
);

// Get quota for a model
const quota = await modelMap.getQuotaByModel(model);

// Extract model from LanguageModelnstance
const modelInfo = await modelMap.getModelFromLanguageModelanguageModel);

// Normalize provider:model format
const normalized = await modelMap.normalizeProviderModel(
  'azure-openai.chat:gpt-4',
);
```

#### Database Schema Requirements

The ModelMap service expects these database tables:

```sql
-- Models table
CREATE TABLE models (
    id UUID PRIMARY KEY,
    provider_id UUID REFERENCES providers(id),
    model_name VARCHAR NOT NULL,
    display_name VARCHAR,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- Model Quotas table
CREATE TABLE model_quotas (
    id UUID PRIMARY KEY,
    model_id UUID REFERENCES models(id),
    max_tokens_per_message INTEGER,
    max_tokens_per_minute INTEGER,
    max_tokens_per_day INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- Providers table (managed by ProviderMap)
CREATE TABLE providers (
    id UUID PRIMARY KEY,
    name VARCHAR NOT NULL UNIQUE,
    display_name VARCHAR,
    is_active BOOLEAN DEFAULT true
);
```

### ProviderMap (`provider-map.ts`)

Manages AI provider configurations and name normalization.

### TokenStatsService (`token-stats-service.ts`)

Tracks token usage statistics and quota enforcement.

## Usage Examples

### Basic Model Lookup

```typescript
import { ModelMap } from '/lib/ai/services/model-stats';

const modelMap = await ModelMap.getInstance();

// Find a specific model
const gpt4 = await modelMap.getModelByProviderAndName(
  'azure-openai.chat',
  'gpt-4',
);
if (gpt4) {
  console.log('Found model:', gpt4.displayName);

  // Get its quota
  const quota = await modelMap.getQuotaByModel(gpt4);
  if (quota) {
    console.log('Daily token limit:', quota.maxTokensPerDay);
  }
}
```

### Working with LanguageModel

```typescript
import { aiModelFactory } from '/lib/ai';
import { ModelMap } from '/lib/ai/services/model-stats';

const model = aiModelFactory('hifi'); // Returns LanguageModelnstance
const modelMap = await ModelMap.getInstance();

// Extract model information
const modelInfo = await modelMap.getModelFromLanguageModelodel);
if (modelInfo.model && modelInfo.quota) {
  console.log(`Model: ${modelInfo.model.displayName}`);
  console.log(`Quota: ${modelInfo.quota.maxTokensPerMessage} tokens/message`);
}
```

### Provider Name Normalization

```typescript
const modelMap = await ModelMap.getInstance();

// All these formats work:
const norm1 = await modelMap.normalizeProviderModel(
  'azure-openai.chat',
  'gpt-4',
);
const norm2 = await modelMap.normalizeProviderModel('azure-openai.chat:gpt-4');

console.log(norm1.provider); // 'azure-openai.chat'
console.log(norm1.modelName); // 'gpt-4'
console.log(norm1.providerId); // UUID of provider
```

### Error Handling

```typescript
const modelMap = await ModelMap.getInstance();

// Handle unknown providers gracefully
const result = await modelMap.normalizeProviderModel(
  'unknown-provider',
  'some-model',
);
if (!result.providerId) {
  try {
    result.rethrow(); // Throws descriptive error
  } catch (error) {
    console.error('Provider not found:', error.message);
  }
}
```

## Testing

Comprehensive test coverage includes:

- Singleton pattern behavior
- Database initialization and caching
- Provider/model normalization
- LanguageModelntegration
- Error handling and edge cases
- Cache TTL behavior

Run tests with:

```bash
yarn test --testPathPatterns="model-map"
```

## Performance Considerations

- **Local Caching**: 5-minute TTL reduces database queries
- **Concurrent Initialization**: Singleton ensures thread-safe initialization
- **Database Queries**: Optimized joins for models with providers and quotas
- **Memory Usage**: Maps cached in memory for O(1) lookups

## Migration from TokenStatsService

The `loadQuotaFromDatabase` function was extracted from `TokenStatsService` and enhanced in `ModelMap`. Key improvements:

1. **Better Caching**: TTL-based cache vs. no caching
2. **Provider Integration**: Direct provider name resolution
3. **Type Safety**: Full TypeScript types and JSDoc documentation
4. **Error Handling**: Comprehensive error recovery and logging
5. **LanguageModelupport**: Direct integration with AI SDK models

## Future Enhancements

- **Dynamic Quota Updates**: Real-time quota adjustments
- **Model Availability Tracking**: Track provider availability status
- **Usage Analytics**: Integration with token usage statistics
- **Configuration Management**: Runtime configuration updates
- **Multi-Tenant Support**: Tenant-specific model configurations
