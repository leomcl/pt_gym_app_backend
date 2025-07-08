

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."training_location_enum" AS ENUM (
    'specific_gym',
    'generic_gym',
    'home_gym',
    'bodyweight_only'
);


ALTER TYPE "public"."training_location_enum" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_profile_complete"("user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = user_id 
        AND profile_completed = true
        AND full_name IS NOT NULL
        AND date_of_birth IS NOT NULL
        AND height_cm IS NOT NULL
        AND weight_kg IS NOT NULL
        AND training_experience_years IS NOT NULL
        AND primary_fitness_goal IS NOT NULL
    );
END;
$$;


ALTER FUNCTION "public"."is_profile_complete"("user_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."gyms" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "location" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."gyms" OWNER TO "postgres";


COMMENT ON TABLE "public"."gyms" IS 'Stores information about specific, partner gyms.';



COMMENT ON COLUMN "public"."gyms"."name" IS 'The official display name of the gym.';



CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text",
    "date_of_birth" "date",
    "height_cm" integer,
    "weight_kg" numeric(5,2),
    "training_experience_years" integer,
    "current_training_split" "text",
    "training_days_per_week" integer,
    "does_cardio" boolean DEFAULT false,
    "cardio_type" "text",
    "cardio_frequency_per_week" integer DEFAULT 0,
    "preferred_training_time" "text",
    "wake_up_time" time without time zone,
    "bed_time" time without time zone,
    "short_term_goal" "text",
    "long_term_goal" "text",
    "primary_fitness_goal" "text",
    "preferred_workout_duration" integer,
    "profile_completed" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "training_location_type" "public"."training_location_enum",
    "specific_gym_id" "uuid",
    "dietary_preferences" "jsonb",
    "allergies" "text"[],
    "user_wants" "text",
    "user_avoids" "text"
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."gyms"
    ADD CONSTRAINT "gyms_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."gyms"
    ADD CONSTRAINT "gyms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_user_profiles_created_at" ON "public"."user_profiles" USING "btree" ("created_at");



CREATE INDEX "idx_user_profiles_profile_completed" ON "public"."user_profiles" USING "btree" ("profile_completed");



CREATE OR REPLACE TRIGGER "handle_user_profiles_updated_at" BEFORE UPDATE ON "public"."user_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Allow authenticated users to read gyms" ON "public"."gyms" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can delete own profile" ON "public"."user_profiles" FOR DELETE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can insert own profile" ON "public"."user_profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own profile" ON "public"."user_profiles" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can view own profile" ON "public"."user_profiles" FOR SELECT USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."gyms" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_profile_complete"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_profile_complete"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_profile_complete"("user_id" "uuid") TO "service_role";


















GRANT ALL ON TABLE "public"."gyms" TO "anon";
GRANT ALL ON TABLE "public"."gyms" TO "authenticated";
GRANT ALL ON TABLE "public"."gyms" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























RESET ALL;
