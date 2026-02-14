CREATE TABLE "chat_tool" (
	"chat_tool_id" uuid PRIMARY KEY NOT NULL,
	"tool_name" text NOT NULL,
	"input_schema" text,
	"output_schema" text,
	"description" text NOT NULL,
	"provider_options" jsonb
);
--> statement-breakpoint
CREATE TABLE "chat_tool_calls" (
	"chat_tool_call_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chat_tool_id" uuid NOT NULL,
	"chat_message_id" uuid NOT NULL,
	"provider_id" text NOT NULL,
	"input" text,
	"output" text,
	"timestamp" time with time zone NOT NULL,
	"provider_options" jsonb
);
--> statement-breakpoint
ALTER TABLE "chat_history" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "intermediate_llm_request_logs" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sessions_ext" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "chat_history" CASCADE;--> statement-breakpoint
DROP TABLE "intermediate_llm_request_logs" CASCADE;--> statement-breakpoint
DROP TABLE "sessions_ext" CASCADE;--> statement-breakpoint
ALTER TABLE "token_consumption_stats" DROP CONSTRAINT "token_stats_model_window_unique";--> statement-breakpoint
ALTER TABLE "token_consumption_stats" DROP CONSTRAINT "token_stats_window_type_check";--> statement-breakpoint
ALTER TABLE "document_property" DROP CONSTRAINT "document_property_emails";
--> statement-breakpoint
ALTER TABLE "user_public_keys" DROP CONSTRAINT "fk_user_public_keys_user_id";
--> statement-breakpoint
DROP INDEX "idx_model_quotas_active";--> statement-breakpoint
DROP INDEX "idx_token_stats_window_start";--> statement-breakpoint
DROP INDEX "idx_token_stats_window_type";--> statement-breakpoint
DROP INDEX "idx_token_stats_last_updated";--> statement-breakpoint
ALTER TABLE "chat_messages" DROP CONSTRAINT "chat_messages_pkey";--> statement-breakpoint
ALTER TABLE "chat_messages" ALTER COLUMN "message_timestamp" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "chat_messages" ALTER COLUMN "message_timestamp" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "chat_message_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "document_units" ADD COLUMN "user_id" integer NOT NULL DEFAULT 3;--> statement-breakpoint
ALTER TABLE "document_units" ALTER COLUMN "user_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "providers" ADD COLUMN "aliases" text[];--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "session_token" varchar(255) PRIMARY KEY NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "chat_tool_calls" ADD CONSTRAINT "fk_chat_message" FOREIGN KEY ("chat_message_id") REFERENCES "public"."chat_messages"("chat_message_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_tool_calls" ADD CONSTRAINT "fk_chat_tool" FOREIGN KEY ("chat_tool_id") REFERENCES "public"."chat_tool"("chat_tool_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_units" ADD CONSTRAINT "document_units_email_property_id_fkey1" FOREIGN KEY ("document_property_id") REFERENCES "public"."document_property"("property_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_units" ADD CONSTRAINT "document_units_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "FK_users" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_public_keys" ADD CONSTRAINT "user_public_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_document_units_user_id" ON "document_units" USING btree ("user_id" int4_ops);--> statement-breakpoint
ALTER TABLE "sessions" DROP COLUMN "id";--> statement-breakpoint
ALTER TABLE "sessions" DROP COLUMN "sessionToken";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "emailVerified";--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "ux_chat_message" UNIQUE("chat_id","turn_id","message_id");--> statement-breakpoint
ALTER TABLE "token_consumption_stats" ADD CONSTRAINT "token_stats_model_window_unique" UNIQUE("window_start","window_type","model_id");--> statement-breakpoint
ALTER TABLE "token_consumption_stats" ADD CONSTRAINT "token_stats_window_type_check" CHECK (window_type = ANY (ARRAY['minute'::text, 'hour'::text, 'day'::text]));