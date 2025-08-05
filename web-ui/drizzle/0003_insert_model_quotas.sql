-- Insert model quotas for AI models
-- Description: Adds quota configuration for Azure OpenAI and Google AI models

-- Insert quotas for models with provider references
INSERT INTO model_quotas (model_id, max_tokens_per_message, max_tokens_per_minute, max_tokens_per_day)
SELECT 
    m.id as model_id,
    q.max_tokens_per_message,
    q.max_tokens_per_minute,
    NULL as max_tokens_per_day  -- Not specified in the requirements
FROM (VALUES
    -- Azure OpenAI models (mapping to existing model names)
    ('azure', 'gpt-4.1', 128000, 50000),      -- gpt-4.1 maps to hifi
    ('azure', 'gpt-4o-mini', 128000, 200000),     -- gpt-4o-mini maps to lofi  
    ('azure', 'o3-mini', 200000, 200000), -- o3-mini maps to completions
    
    -- Google AI models
    ('google', 'gemini-2.0-flash', 1048576, 15728640),
    ('google', 'gemini-2.5-pro', 1048576, 157286400),
    ('google', 'gemini-2.5-flash', 1048576, 10485760)
) AS q(provider_name, model_name, max_tokens_per_message, max_tokens_per_minute)
JOIN providers p ON p.name = q.provider_name
JOIN models m ON m.provider_id = p.id AND m.model_name = q.model_name

ON CONFLICT (model_id) DO UPDATE SET
    max_tokens_per_message = EXCLUDED.max_tokens_per_message,
    max_tokens_per_minute = EXCLUDED.max_tokens_per_minute,
    updated_at = now();