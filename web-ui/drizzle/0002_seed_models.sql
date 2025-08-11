-- Sample data for providers and models tables
-- Insert commonly used AI providers and models

-- First, insert providers
INSERT INTO providers ("name", display_name, description) VALUES
('azure', 'Azure OpenAI', 'Microsoft Azure OpenAI Service for enterprise AI solutions'),
('google', 'Google AI', 'Google AI Platform including Gemini models')
ON CONFLICT ("name") DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    updated_at = now();

-- Then, insert models with provider references
INSERT INTO models (provider_id, model_name, display_name, description) 
SELECT 
    p.id as provider_id,
    m.model_name,
    m.display_name,
    m.description
FROM (VALUES
    -- Azure OpenAI models
    ('azure', 'gpt-4.1', 'Azure GPT-4.1', 'High-fidelity Azure OpenAI GPT-4 model for complex reasoning and analysis'),
    ('azure', 'gpt-4o-mini', 'Azure GPT-4o Mini', 'Low-fidelity Azure OpenAI GPT-4o mini model for general purpose tasks'),
    ('azure', 'o3-mini', 'Azure O3 Mini', 'Azure OpenAI O3 mini model for completions'),
    ('azure', 'embedding', 'Azure Text Embedding', 'Azure OpenAI text embedding model'),

    -- Google AI models
    ('google', 'gemini-2.5-pro', 'Google Gemini 2.5 Pro', 'Google Gemini 2.5 Pro model for advanced reasoning'),
    ('google', 'gemini-2.5-flash', 'Google Gemini 2.5 Flash', 'Google Gemini 2.5 Flash model for fast responses'),
    ('google', 'gemini-2.0-flash', 'Google Gemini 2.0 Flash', 'Google Gemini 2.0 Flash model for fast responses'),
    ('google', 'google-embedding', 'Google Text Embedding', 'Google text embedding model')


) AS m(provider_name, model_name, display_name, description)
JOIN providers p ON p.name = m.provider_name

ON CONFLICT (provider_id, model_name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    updated_at = now();
