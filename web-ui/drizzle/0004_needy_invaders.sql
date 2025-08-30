CREATE TABLE "chat_messages" (
	"chat_id" text NOT NULL,
	"turn_id" integer NOT NULL,
	"message_id" integer NOT NULL,
	"role" text NOT NULL,
	"content" text,
	"tool_name" text,
	"function_call" jsonb,
	"tool_result" jsonb,
	"message_order" integer NOT NULL,
	"status_id" smallint NOT NULL,
	"provider_id" text,
	"metadata" jsonb,
	"tool_instance_id" uuid,
	"optimized_content" text,
	"message_timestamp" timestamp DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT "chat_messages_pkey" PRIMARY KEY("chat_id","turn_id","message_id"),
	CONSTRAINT "chat_messages_role_check" CHECK (role = ANY (ARRAY['user'::text, 'assistant'::text, 'tool'::text, 'system'::text]))
);
--> statement-breakpoint
CREATE TABLE "chat_turn_message_sequences" (
	"chat_id" text NOT NULL,
	"turn_id" integer NOT NULL,
	"last_message_id" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "chat_turn_message_sequences_pkey" PRIMARY KEY("chat_id","turn_id")
);
--> statement-breakpoint
CREATE TABLE "chat_turn_sequences" (
	"chat_id" text PRIMARY KEY NOT NULL,
	"last_turn_id" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_turns" (
	"chat_id" text NOT NULL,
	"turn_id" integer NOT NULL,
	"status_id" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"completed_at" timestamp with time zone,
	"model_name" text,
	"temperature" real,
	"top_p" real,
	"latency_ms" integer,
	"warnings" text[],
	"errors" text[],
	"metadata" jsonb,
	"provider_id" text,
	"optimized_prompt_assistant" text,
	"optimized_prompt_user" text,
	"optimized_tool_results" text,
	CONSTRAINT "chat_turns_pkey" PRIMARY KEY("chat_id","turn_id")
);
--> statement-breakpoint
CREATE TABLE "chats" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"title" text,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "document_relationship" (
	"source_document_id" integer NOT NULL,
	"target_document_id" integer NOT NULL,
	"relationship_reason_id" integer NOT NULL,
	"timestamp" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "document_relationship_pkey" PRIMARY KEY("source_document_id","target_document_id","relationship_reason_id")
);
--> statement-breakpoint
CREATE TABLE "intermediate_llm_request_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chat_id" text NOT NULL,
	"turn_id" integer NOT NULL,
	"tool_instance_id" uuid,
	"provider_id" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"prompt" jsonb,
	"response" jsonb,
	"prompt_tokens" integer,
	"completion_tokens" integer,
	"total_tokens" integer,
	"latency_ms" integer,
	"error" text,
	"warnings" text[]
);
--> statement-breakpoint
CREATE TABLE "mcp_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"tool_instance_id" uuid,
	"event_type" text,
	"message" text,
	"event_time" timestamp with time zone DEFAULT now(),
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "mcp_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chat_id" text NOT NULL,
	"turn_id" integer NOT NULL,
	"provider_id" text,
	"started_at" timestamp with time zone DEFAULT now(),
	"ended_at" timestamp with time zone,
	"status" text,
	"error" text,
	"metadata" jsonb,
	CONSTRAINT "mcp_sessions_status_check" CHECK (status = ANY (ARRAY['active'::text, 'completed'::text, 'error'::text]))
);
--> statement-breakpoint
CREATE TABLE "message_statuses" (
	"id" smallint PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"description" text,
	CONSTRAINT "message_statuses_code_key" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "model_quotas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_id" uuid NOT NULL,
	"max_tokens_per_message" integer,
	"max_tokens_per_minute" integer,
	"max_tokens_per_day" integer,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "model_quotas_model_unique" UNIQUE("model_id")
);
--> statement-breakpoint
CREATE TABLE "models" (
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
--> statement-breakpoint
CREATE TABLE "providers" (
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
--> statement-breakpoint
CREATE TABLE "token_consumption_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_id" uuid NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"window_end" timestamp with time zone NOT NULL,
	"window_type" text NOT NULL,
	"prompt_tokens" integer DEFAULT 0 NOT NULL,
	"completion_tokens" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"request_count" integer DEFAULT 0 NOT NULL,
	"last_updated" timestamp with time zone DEFAULT now(),
	CONSTRAINT "token_stats_model_window_unique" UNIQUE("model_id","window_start","window_type"),
	CONSTRAINT "token_stats_window_type_check" CHECK (window_type IN ('minute', 'hour', 'day'))
);
--> statement-breakpoint
CREATE TABLE "token_usage" (
	"chat_id" text NOT NULL,
	"turn_id" integer NOT NULL,
	"prompt_tokens" integer,
	"completion_tokens" integer,
	"total_tokens" integer,
	CONSTRAINT "token_usage_pkey" PRIMARY KEY("chat_id","turn_id")
);
--> statement-breakpoint
CREATE TABLE "turn_statuses" (
	"id" smallint PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"description" text,
	CONSTRAINT "turn_statuses_code_key" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "user_public_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"public_key" text NOT NULL,
	"effective_date" timestamp NOT NULL,
	"expiration_date" timestamp,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
DROP VIEW "public"."ResponsiveAction";--> statement-breakpoint
ALTER TABLE "document_property_related_document" RENAME TO "document_property_related_document_old";--> statement-breakpoint
ALTER TABLE "document_property_relation_reason" RENAME TO "document_relationship_reason";--> statement-breakpoint
ALTER TABLE "sessions" RENAME COLUMN "session_token" TO "sessionToken";--> statement-breakpoint
ALTER TABLE "accounts" DROP CONSTRAINT "constraint_user_id";--> statement-breakpoint
ALTER TABLE "document_units" DROP CONSTRAINT "document_units_email_property_id_fkey1";
--> statement-breakpoint
ALTER TABLE "violation_details" DROP CONSTRAINT "violation_details_action_fk";
--> statement-breakpoint
ALTER TABLE "violation_details" DROP CONSTRAINT "violation_details_attachment_fk";
--> statement-breakpoint
ALTER TABLE "violation_details" DROP CONSTRAINT "violation_details_key_point_fk";
--> statement-breakpoint
ALTER TABLE "violation_details" DROP CONSTRAINT "violation_details_property_id_fkey";
--> statement-breakpoint
ALTER TABLE "document_property_related_document_old" DROP CONSTRAINT "fk_document";
--> statement-breakpoint
ALTER TABLE "document_property_related_document_old" DROP CONSTRAINT "fk_property";
--> statement-breakpoint
ALTER TABLE "document_property_related_document_old" DROP CONSTRAINT "fk_relation";
--> statement-breakpoint
DROP INDEX "idx_attachment_search";--> statement-breakpoint
DROP INDEX "idx_violation_details_action_property_id";--> statement-breakpoint
DROP INDEX "idx_violation_details_key_point_property_id";--> statement-breakpoint
DROP INDEX "idx_violation_details_attachment_id";--> statement-breakpoint
ALTER TABLE "violation_details" ALTER COLUMN "violation_type" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "violation_details" ALTER COLUMN "severity_level" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "violation_details" ALTER COLUMN "detected_by" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "violation_details" ALTER COLUMN "detected_on" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "emails" ADD COLUMN "document_type" text GENERATED ALWAYS AS ('email'::text) STORED;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "created_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "violation_details" ADD COLUMN "email_document_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "violation_details" ADD COLUMN "violation_reasons" text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "violation_details" ADD COLUMN "title_ix_relevancy" double precision NOT NULL;--> statement-breakpoint
ALTER TABLE "violation_details" ADD COLUMN "chapt_13_relevancy" double precision NOT NULL;--> statement-breakpoint
ALTER TABLE "violation_details" ADD COLUMN "ferpa_relevancy" double precision NOT NULL;--> statement-breakpoint
ALTER TABLE "violation_details" ADD COLUMN "other_relevancy" jsonb;--> statement-breakpoint
ALTER TABLE "violation_details" ADD COLUMN "severity_reasons" text[];--> statement-breakpoint
ALTER TABLE "key_points_details" ADD COLUMN "compliance_reasons" text[];--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_chat_id_turn_id_fkey" FOREIGN KEY ("chat_id","turn_id") REFERENCES "public"."chat_turns"("chat_id","turn_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "public"."message_statuses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_turns" ADD CONSTRAINT "chat_turns_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_turns" ADD CONSTRAINT "chat_turns_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "public"."turn_statuses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_relationship" ADD CONSTRAINT "fk_relation" FOREIGN KEY ("relationship_reason_id") REFERENCES "public"."document_relationship_reason"("relation_reason_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_relationship" ADD CONSTRAINT "fk_source" FOREIGN KEY ("source_document_id") REFERENCES "public"."document_units"("unit_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_relationship" ADD CONSTRAINT "fk_target" FOREIGN KEY ("target_document_id") REFERENCES "public"."document_units"("unit_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intermediate_llm_request_logs" ADD CONSTRAINT "intermediate_llm_request_logs_chat_id_turn_id_fkey" FOREIGN KEY ("chat_id","turn_id") REFERENCES "public"."chat_turns"("chat_id","turn_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_events" ADD CONSTRAINT "mcp_events_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."mcp_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_sessions" ADD CONSTRAINT "mcp_sessions_chat_id_turn_id_fkey" FOREIGN KEY ("chat_id","turn_id") REFERENCES "public"."chat_turns"("chat_id","turn_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_quotas" ADD CONSTRAINT "model_quotas_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "public"."models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "models" ADD CONSTRAINT "models_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_consumption_stats" ADD CONSTRAINT "token_consumption_stats_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "public"."models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "token_usage" ADD CONSTRAINT "token_usage_chat_id_turn_id_fkey" FOREIGN KEY ("chat_id","turn_id") REFERENCES "public"."chat_turns"("chat_id","turn_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_public_keys" ADD CONSTRAINT "fk_user_public_keys_user_id" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_messages_provider_id" ON "chat_messages" USING btree ("provider_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_messages_status_id" ON "chat_messages" USING btree ("status_id" int2_ops);--> statement-breakpoint
CREATE INDEX "idx_messages_tool_instance_id" ON "chat_messages" USING btree ("tool_instance_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_turns_created_at" ON "chat_turns" USING btree ("created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_turns_provider_id" ON "chat_turns" USING btree ("provider_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_turns_status_id" ON "chat_turns" USING btree ("status_id" int2_ops);--> statement-breakpoint
CREATE INDEX "idx_chats_created_at" ON "chats" USING btree ("created_at" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_chats_user_id" ON "chats" USING btree ("user_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_llm_logs_provider_id" ON "intermediate_llm_request_logs" USING btree ("provider_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_llm_logs_tool_instance_id" ON "intermediate_llm_request_logs" USING btree ("tool_instance_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_mcp_events_tool_instance_id" ON "mcp_events" USING btree ("tool_instance_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_mcp_sessions_provider_id" ON "mcp_sessions" USING btree ("provider_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_model_quotas_model_id" ON "model_quotas" USING btree ("model_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_model_quotas_active" ON "model_quotas" USING btree ("is_active" bool_ops);--> statement-breakpoint
CREATE INDEX "idx_models_provider_id" ON "models" USING btree ("provider_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_models_model_name" ON "models" USING btree ("model_name" text_ops);--> statement-breakpoint
CREATE INDEX "idx_models_active" ON "models" USING btree ("is_active" bool_ops);--> statement-breakpoint
CREATE INDEX "idx_providers_name" ON "providers" USING btree ("name" text_ops);--> statement-breakpoint
CREATE INDEX "idx_providers_active" ON "providers" USING btree ("is_active" bool_ops);--> statement-breakpoint
CREATE INDEX "idx_token_stats_model_id" ON "token_consumption_stats" USING btree ("model_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_token_stats_window_start" ON "token_consumption_stats" USING btree ("window_start" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_token_stats_window_type" ON "token_consumption_stats" USING btree ("window_type" text_ops);--> statement-breakpoint
CREATE INDEX "idx_token_stats_last_updated" ON "token_consumption_stats" USING btree ("last_updated" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_user_public_keys_user_id" ON "user_public_keys" USING btree ("user_id" int4_ops);--> statement-breakpoint
CREATE INDEX "idx_user_public_keys_effective" ON "user_public_keys" USING btree ("effective_date" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_user_public_keys_expiration" ON "user_public_keys" USING btree ("expiration_date" timestamp_ops);--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_idx" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "violation_details" ADD CONSTRAINT "violation_email" FOREIGN KEY ("email_document_id") REFERENCES "public"."document_units"("unit_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_property_related_document_old" ADD CONSTRAINT "fk_document" FOREIGN KEY ("document_id") REFERENCES "public"."document_units"("unit_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_property_related_document_old" ADD CONSTRAINT "fk_property" FOREIGN KEY ("related_property_id") REFERENCES "public"."document_property"("property_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_property_related_document_old" ADD CONSTRAINT "fk_relation" FOREIGN KEY ("relationship_type") REFERENCES "public"."document_relationship_reason"("relation_reason_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_violation_details_attachment_id" ON "violation_details" USING btree ("email_document_id" int4_ops);--> statement-breakpoint
ALTER TABLE "email_attachments" DROP COLUMN "extracted_text_tsv";--> statement-breakpoint
ALTER TABLE "staging_message" DROP COLUMN "message";--> statement-breakpoint
ALTER TABLE "violation_details" DROP COLUMN "attachment_id";--> statement-breakpoint
ALTER TABLE "violation_details" DROP COLUMN "key_point_property_id";--> statement-breakpoint
ALTER TABLE "violation_details" DROP COLUMN "action_property_id";--> statement-breakpoint
ALTER TABLE "document_unit_embeddings" DROP COLUMN "vector";--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "constraint_userId" UNIQUE("user_id");--> statement-breakpoint
CREATE MATERIALIZED VIEW "public"."document_property_related_document" AS (SELECT du.document_property_id AS related_property_id, dpr.target_document_id AS document_id, dpr.relationship_reason_id AS relationship_type, dpr."timestamp" FROM document_relationship dpr JOIN document_units du ON dpr.source_document_id = du.unit_id);--> statement-breakpoint
CREATE VIEW "public"."ResponsiveAction" AS (SELECT cta.property_id AS call_to_action_id, dp_cta.document_id AS call_to_action_source_document_id, ra.property_id AS responsive_action_id, dp_ra.document_id AS responsive_action_source_document_id, dp_cta.property_value AS request_contents, dp_ra.property_value AS response_contents, cta.inferred AS request_inferred, ra.inferred AS response_inferred, cta.completion_percentage AS request_completion_percentage, lnk.completion_percentage AS response_completion_percentage, lnk.completion_percentage_reasons AS response_completion_percentage_reasons, cta.opened_date AS request_opened_date, cta.compliancy_close_date AS request_compliancy_deadline, cta.compliance_date_enforceable AS enforceable_compliance_date, cta.closed_date AS request_closed_date, ra.response_timestamp AS response_date, cta.compliancy_close_date::timestamp with time zone - COALESCE(ra.response_timestamp::timestamp with time zone, CURRENT_TIMESTAMP) AS response_days_until_deadline, cta.severity AS request_severity, cta.severity_reason AS request_severity_reason, cta.title_ix_applicable, cta.title_ix_applicable_reasons, lnk.compliance_chapter_13, lnk.compliance_chapter_13_reasons, ra.severity AS response_severity, ra.severity_reasons AS response_severity_reason, ARRAY( SELECT rd.document_id FROM document_property_related_document_old rd WHERE rd.related_property_id = cta.property_id OR rd.related_property_id = ra.property_id) AS related_documents FROM call_to_action_details cta JOIN document_property dp_cta ON cta.property_id = dp_cta.property_id LEFT JOIN call_to_action_details_call_to_action_response lnk ON cta.property_id = lnk.call_to_action_id LEFT JOIN call_to_action_response_details ra ON lnk.call_to_action_response_id = ra.property_id LEFT JOIN document_property dp_ra ON ra.property_id = dp_ra.property_id ORDER BY dp_cta.created_on, ra.response_timestamp);