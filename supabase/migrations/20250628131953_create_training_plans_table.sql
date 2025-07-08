-- Create training_plans table for storing user training plans
CREATE TABLE IF NOT EXISTS "public"."training_plans" (
    "plan_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "plan_name" "text" NOT NULL,
    "start_date" "date" NOT NULL,
    "plan_data" "jsonb" NOT NULL,
    "is_active" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);

-- Set table ownership
ALTER TABLE "public"."training_plans" OWNER TO "postgres";

-- Add primary key constraint
ALTER TABLE ONLY "public"."training_plans"
    ADD CONSTRAINT "training_plans_pkey" PRIMARY KEY ("plan_id");

-- Add foreign key constraint to auth.users with cascade delete
ALTER TABLE ONLY "public"."training_plans"
    ADD CONSTRAINT "training_plans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;

-- Add unique constraint to ensure only one active plan per user
ALTER TABLE ONLY "public"."training_plans"
    ADD CONSTRAINT "training_plans_user_active_unique" UNIQUE ("user_id", "is_active") DEFERRABLE INITIALLY DEFERRED;

-- Create indexes for performance
CREATE INDEX "idx_training_plans_user_id" ON "public"."training_plans" USING "btree" ("user_id");
CREATE INDEX "idx_training_plans_is_active" ON "public"."training_plans" USING "btree" ("is_active");
CREATE INDEX "idx_training_plans_start_date" ON "public"."training_plans" USING "btree" ("start_date");
CREATE INDEX "idx_training_plans_created_at" ON "public"."training_plans" USING "btree" ("created_at");

-- Create updated_at trigger function (reuse existing one)
CREATE OR REPLACE TRIGGER "handle_training_plans_updated_at" 
    BEFORE UPDATE ON "public"."training_plans" 
    FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();

-- Enable Row Level Security
ALTER TABLE "public"."training_plans" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own training plans" ON "public"."training_plans" 
    FOR SELECT USING (("auth"."uid"() = "user_id"));

CREATE POLICY "Users can insert own training plans" ON "public"."training_plans" 
    FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));

CREATE POLICY "Users can update own training plans" ON "public"."training_plans" 
    FOR UPDATE USING (("auth"."uid"() = "user_id")) 
    WITH CHECK (("auth"."uid"() = "user_id"));

CREATE POLICY "Users can delete own training plans" ON "public"."training_plans" 
    FOR DELETE USING (("auth"."uid"() = "user_id"));

-- Grant permissions
GRANT ALL ON TABLE "public"."training_plans" TO "anon";
GRANT ALL ON TABLE "public"."training_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."training_plans" TO "service_role";

-- Add table comment
COMMENT ON TABLE "public"."training_plans" IS 'Stores AI-generated training plans for users with rotational scheduling support';
COMMENT ON COLUMN "public"."training_plans"."plan_data" IS 'JSONB containing the complete training plan structure with weeks, days, and exercises';
COMMENT ON COLUMN "public"."training_plans"."start_date" IS 'Date when user begins this plan, used for calculating current week/day';
COMMENT ON COLUMN "public"."training_plans"."is_active" IS 'Only one plan can be active per user at a time';