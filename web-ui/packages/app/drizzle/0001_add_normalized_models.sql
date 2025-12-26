-- Migration: Add normalized models tables
-- Description: Creates normalized models and providers tables and updates token-related tables to reference them

-- Create the providers table first
CREATE TABLE IF NOT EXISTS "providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"display_name" text NOT NULL,
	"description" text,
	"base_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "providers_name_unique" UNIQUE("name")
);

-- Create indexes for providers table
CREATE INDEX IF NOT EXISTS "idx_providers_name" ON "providers" USING btree ("name");
CREATE INDEX IF NOT EXISTS "idx_providers_active" ON "providers" USING btree ("is_active");

-- Create the models table
CREATE TABLE IF NOT EXISTS "models" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" uuid NOT NULL,
	"model_name" text NOT NULL,
	"display_name" text,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "models_provider_model_unique" UNIQUE("provider_id","model_name")
);

-- Create indexes for models table
CREATE INDEX IF NOT EXISTS "idx_models_provider_id" ON "models" USING btree ("provider_id");
CREATE INDEX IF NOT EXISTS "idx_models_model_name" ON "models" USING btree ("model_name");
CREATE INDEX IF NOT EXISTS "idx_models_active" ON "models" USING btree ("is_active");

-- Add foreign key constraint for models table
ALTER TABLE "models" ADD CONSTRAINT "models_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE cascade;

-- Create model_quotas table if it doesn't exist
CREATE TABLE IF NOT EXISTS "model_quotas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_id" uuid,	"max_tokens_per_message" integer,
	"max_tokens_per_minute" integer,
	"max_tokens_per_day" integer,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"is_active" boolean DEFAULT true NOT NULL
);

-- Create token_consumption_stats table if it doesn't exist
CREATE TABLE IF NOT EXISTS "token_consumption_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text,  -- Will be dropped later in favor of model_id
	"model_name" text,  -- Will be dropped later in favor of model_id
	"window_start" timestamp with time zone NOT NULL,
	"window_end" timestamp with time zone NOT NULL,
	"window_type" text NOT NULL,
	"prompt_tokens" integer DEFAULT 0 NOT NULL,
	"completion_tokens" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"request_count" integer DEFAULT 0 NOT NULL,
	"last_updated" timestamp with time zone DEFAULT now(),
	CONSTRAINT "token_stats_window_type_check" CHECK (window_type IN ('minute', 'hour', 'day'))
);

-- Drop existing constraints and indexes from model_quotas that reference provider/model_name
ALTER TABLE "model_quotas" DROP CONSTRAINT IF EXISTS "model_quotas_provider_model_unique";
DROP INDEX IF EXISTS "idx_model_quotas_provider";
DROP INDEX IF EXISTS "idx_model_quotas_model_name";

-- Add model_id column to model_quotas (nullable initially for data migration)
ALTER TABLE "model_quotas" ADD COLUMN IF NOT EXISTS "model_id" uuid;

-- Create temporary function to populate model_id for existing data
DO $$
DECLARE
    quota_record RECORD;
    provider_uuid uuid;
    model_uuid uuid;
BEGIN
    -- Loop through existing model_quotas records
    FOR quota_record IN SELECT id, provider, model_name FROM model_quotas WHERE model_id IS NULL LOOP
        -- Insert or get existing provider record
        INSERT INTO providers (name, display_name)
        VALUES (quota_record.provider, INITCAP(quota_record.provider))
        ON CONFLICT (name) DO NOTHING;
        
        -- Get the provider ID
        SELECT id INTO provider_uuid FROM providers WHERE name = quota_record.provider;
        
        -- Insert or get existing model record
        INSERT INTO models (provider_id, model_name, display_name)
        VALUES (provider_uuid, quota_record.model_name, quota_record.provider || ':' || quota_record.model_name)
        ON CONFLICT (provider_id, model_name) DO NOTHING;
        
        -- Get the model ID
        SELECT id INTO model_uuid FROM models WHERE provider_id = provider_uuid AND model_name = quota_record.model_name;
        
        -- Update the quota record
        UPDATE model_quotas SET model_id = model_uuid WHERE id = quota_record.id;
    END LOOP;
END $$;

-- Make model_id NOT NULL and add foreign key constraint
ALTER TABLE "model_quotas" ALTER COLUMN "model_id" SET NOT NULL;
ALTER TABLE "model_quotas" ADD CONSTRAINT "model_quotas_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "models"("id") ON DELETE cascade;

-- Drop old columns from model_quotas
ALTER TABLE "model_quotas" DROP COLUMN IF EXISTS "provider";
ALTER TABLE "model_quotas" DROP COLUMN IF EXISTS "model_name";

-- Create new unique constraint and indexes for model_quotas
ALTER TABLE "model_quotas" ADD CONSTRAINT "model_quotas_model_unique" UNIQUE("model_id");
CREATE INDEX IF NOT EXISTS "idx_model_quotas_model_id" ON "model_quotas" USING btree ("model_id");

-- Do the same for token_consumption_stats
-- Drop existing constraints and indexes
ALTER TABLE "token_consumption_stats" DROP CONSTRAINT IF EXISTS "token_stats_provider_model_window_unique";
DROP INDEX IF EXISTS "idx_token_stats_provider_model";

-- Add model_id column
ALTER TABLE "token_consumption_stats" ADD COLUMN IF NOT EXISTS "model_id" uuid;

-- Populate model_id for existing data
DO $$
DECLARE
    stats_record RECORD;
    provider_uuid uuid;
    model_uuid uuid;
BEGIN
    -- Loop through existing token_consumption_stats records
    FOR stats_record IN SELECT id, provider, model_name FROM token_consumption_stats WHERE model_id IS NULL LOOP
        -- Insert or get existing provider record
        INSERT INTO providers (name, display_name)
        VALUES (stats_record.provider, INITCAP(stats_record.provider))
        ON CONFLICT (name) DO NOTHING;
        
        -- Get the provider ID
        SELECT id INTO provider_uuid FROM providers WHERE name = stats_record.provider;
        
        -- Insert or get existing model record
        INSERT INTO models (provider_id, model_name, display_name)
        VALUES (provider_uuid, stats_record.model_name, stats_record.provider || ':' || stats_record.model_name)
        ON CONFLICT (provider_id, model_name) DO NOTHING;
        
        -- Get the model ID
        SELECT id INTO model_uuid FROM models WHERE provider_id = provider_uuid AND model_name = stats_record.model_name;
        
        -- Update the stats record
        UPDATE token_consumption_stats SET model_id = model_uuid WHERE id = stats_record.id;
    END LOOP;
END $$;

-- Make model_id NOT NULL and add foreign key constraint
ALTER TABLE "token_consumption_stats" ALTER COLUMN "model_id" SET NOT NULL;
ALTER TABLE "token_consumption_stats" ADD CONSTRAINT "token_consumption_stats_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "models"("id") ON DELETE cascade;

-- Drop old columns from token_consumption_stats
ALTER TABLE "token_consumption_stats" DROP COLUMN IF EXISTS "provider";
ALTER TABLE "token_consumption_stats" DROP COLUMN IF EXISTS "model_name";

-- Create new unique constraint and indexes for token_consumption_stats
ALTER TABLE "token_consumption_stats" ADD CONSTRAINT "token_stats_model_window_unique" UNIQUE("model_id","window_start","window_type");
CREATE INDEX IF NOT EXISTS "idx_token_stats_model_id" ON "token_consumption_stats" USING btree ("model_id");
