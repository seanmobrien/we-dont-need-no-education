-- Migration: Add todo lists and todo items tables
-- Description: Creates tables for managing todo lists and items with user ownership

-- Create todo_status enum
DO $$ BEGIN
  CREATE TYPE "todo_status" AS ENUM ('pending', 'active', 'complete');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create todo_priority enum
DO $$ BEGIN
  CREATE TYPE "todo_priority" AS ENUM ('high', 'medium', 'low');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create todo_lists table
CREATE TABLE IF NOT EXISTS "todo_lists" (
  "list_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" integer NOT NULL,
  "title" varchar(255) NOT NULL,
  "description" text,
  "status" "todo_status" DEFAULT 'active' NOT NULL,
  "priority" "todo_priority" DEFAULT 'medium' NOT NULL,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "fk_todo_lists_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

-- Create todo_items table
CREATE TABLE IF NOT EXISTS "todo_items" (
  "item_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "list_id" uuid NOT NULL,
  "title" varchar(255) NOT NULL,
  "description" text,
  "completed" boolean DEFAULT false NOT NULL,
  "status" "todo_status" DEFAULT 'pending' NOT NULL,
  "priority" "todo_priority" DEFAULT 'medium' NOT NULL,
  "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "fk_todo_items_list_id" FOREIGN KEY ("list_id") REFERENCES "todo_lists"("list_id") ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_todo_lists_user_id" ON "todo_lists" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "idx_todo_items_list_id" ON "todo_items" USING btree ("list_id");
CREATE INDEX IF NOT EXISTS "idx_todo_items_status" ON "todo_items" USING btree ("status");
CREATE INDEX IF NOT EXISTS "idx_todo_items_completed" ON "todo_items" USING btree ("completed");
