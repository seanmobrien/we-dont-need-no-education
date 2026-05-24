-- Seed embedding-small model aliases across providers.

INSERT INTO providers ("name", display_name, description, aliases)
VALUES
  (
    'azure-openai.chat',
    'Azure OpenAI',
    'Microsoft Azure OpenAI Service for enterprise AI solutions',
    ARRAY['azure.chat', 'azure']
  ),
  (
    'google',
    'Google AI',
    'Google AI Platform including Gemini models',
    ARRAY['google.generative-ai']
  ),
  (
    'openai',
    'OpenAI',
    'OpenAI API services',
    ARRAY['openai']
  )
ON CONFLICT ("name") DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  aliases = EXCLUDED.aliases,
  updated_at = now();

INSERT INTO models (provider_id, model_name, display_name, description)
SELECT
  p.id,
  m.model_name,
  m.display_name,
  m.description
FROM (
  VALUES
    (
      'azure-openai.chat',
      'embedding-small',
      'Azure Text Embedding Small',
      'Azure OpenAI small text embedding alias mapped by runtime configuration'
    ),
    (
      'google',
      'embedding-small',
      'Google Text Embedding Small',
      'Google small text embedding alias mapped by runtime configuration'
    ),
    (
      'openai',
      'embedding-small',
      'OpenAI Text Embedding Small',
      'OpenAI small text embedding alias mapped by runtime configuration'
    )
) AS m(provider_name, model_name, display_name, description)
JOIN providers p ON p.name = m.provider_name
ON CONFLICT (provider_id, model_name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  updated_at = now();

INSERT INTO model_quotas (
  model_id,
  max_tokens_per_message,
  max_tokens_per_minute,
  max_tokens_per_day
)
SELECT
  m.id,
  NULL::integer,
  NULL::integer,
  NULL::integer
FROM models m
JOIN providers p ON p.id = m.provider_id
WHERE m.model_name = 'embedding-small'
  AND p.name IN ('azure-openai.chat', 'google', 'openai')
ON CONFLICT (model_id) DO NOTHING;
