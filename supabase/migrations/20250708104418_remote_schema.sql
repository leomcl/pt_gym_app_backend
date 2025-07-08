create table "public"."user_exercise_preferences" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "wants_cumulative" text default ''::text,
    "avoids_cumulative" text default ''::text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."user_exercise_preferences" enable row level security;

create table "public"."weekly_check_ins" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "week_start_date" date not null,
    "week_end_date" date not null,
    "workout_completion" integer not null default 0,
    "plan_adherence" text not null,
    "exercise_struggles" text,
    "exercise_struggle_reasons" text,
    "energy_levels" integer not null,
    "muscle_soreness" text not null,
    "sleep_quality" integer not null,
    "motivation_level" integer not null,
    "experienced_pain" boolean not null default false,
    "pain_location" text,
    "pain_exercise" text,
    "current_weight" numeric(5,2),
    "performance_improvement" text not null,
    "body_measurements" jsonb,
    "nutrition_adherence" text not null,
    "stress_levels" integer not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone
);


alter table "public"."weekly_check_ins" enable row level security;

CREATE INDEX idx_weekly_check_ins_created_at ON public.weekly_check_ins USING btree (created_at);

CREATE INDEX idx_weekly_check_ins_user_id ON public.weekly_check_ins USING btree (user_id);

CREATE INDEX idx_weekly_check_ins_user_week ON public.weekly_check_ins USING btree (user_id, week_start_date);

CREATE INDEX idx_weekly_check_ins_week_start ON public.weekly_check_ins USING btree (week_start_date);

CREATE UNIQUE INDEX user_exercise_preferences_pkey ON public.user_exercise_preferences USING btree (id);

CREATE UNIQUE INDEX weekly_check_ins_pkey ON public.weekly_check_ins USING btree (id);

CREATE UNIQUE INDEX weekly_check_ins_user_id_week_start_date_key ON public.weekly_check_ins USING btree (user_id, week_start_date);

alter table "public"."user_exercise_preferences" add constraint "user_exercise_preferences_pkey" PRIMARY KEY using index "user_exercise_preferences_pkey";

alter table "public"."weekly_check_ins" add constraint "weekly_check_ins_pkey" PRIMARY KEY using index "weekly_check_ins_pkey";

alter table "public"."user_exercise_preferences" add constraint "user_exercise_preferences_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_exercise_preferences" validate constraint "user_exercise_preferences_user_id_fkey";

alter table "public"."weekly_check_ins" add constraint "weekly_check_ins_check" CHECK ((week_end_date = (week_start_date + '6 days'::interval))) not valid;

alter table "public"."weekly_check_ins" validate constraint "weekly_check_ins_check";

alter table "public"."weekly_check_ins" add constraint "weekly_check_ins_check1" CHECK (
CASE
    WHEN (experienced_pain = true) THEN (pain_location IS NOT NULL)
    ELSE true
END) not valid;

alter table "public"."weekly_check_ins" validate constraint "weekly_check_ins_check1";

alter table "public"."weekly_check_ins" add constraint "weekly_check_ins_energy_levels_check" CHECK (((energy_levels >= 1) AND (energy_levels <= 10))) not valid;

alter table "public"."weekly_check_ins" validate constraint "weekly_check_ins_energy_levels_check";

alter table "public"."weekly_check_ins" add constraint "weekly_check_ins_exercise_struggle_reasons_check" CHECK ((exercise_struggle_reasons = ANY (ARRAY['too_difficult'::text, 'form_issues'::text, 'equipment'::text, 'time_constraints'::text, 'injury_concern'::text, 'other'::text]))) not valid;

alter table "public"."weekly_check_ins" validate constraint "weekly_check_ins_exercise_struggle_reasons_check";

alter table "public"."weekly_check_ins" add constraint "weekly_check_ins_motivation_level_check" CHECK (((motivation_level >= 1) AND (motivation_level <= 10))) not valid;

alter table "public"."weekly_check_ins" validate constraint "weekly_check_ins_motivation_level_check";

alter table "public"."weekly_check_ins" add constraint "weekly_check_ins_muscle_soreness_check" CHECK ((muscle_soreness = ANY (ARRAY['none'::text, 'mild'::text, 'moderate'::text, 'severe'::text]))) not valid;

alter table "public"."weekly_check_ins" validate constraint "weekly_check_ins_muscle_soreness_check";

alter table "public"."weekly_check_ins" add constraint "weekly_check_ins_nutrition_adherence_check" CHECK ((nutrition_adherence = ANY (ARRAY['on_point'::text, 'mostly_on_track'::text, 'few_slip_ups'::text, 'write_off'::text]))) not valid;

alter table "public"."weekly_check_ins" validate constraint "weekly_check_ins_nutrition_adherence_check";

alter table "public"."weekly_check_ins" add constraint "weekly_check_ins_performance_improvement_check" CHECK ((performance_improvement = ANY (ARRAY['improved'::text, 'same'::text, 'decreased'::text]))) not valid;

alter table "public"."weekly_check_ins" validate constraint "weekly_check_ins_performance_improvement_check";

alter table "public"."weekly_check_ins" add constraint "weekly_check_ins_plan_adherence_check" CHECK ((plan_adherence = ANY (ARRAY['exactly'::text, 'minor_modifications'::text, 'significant_changes'::text]))) not valid;

alter table "public"."weekly_check_ins" validate constraint "weekly_check_ins_plan_adherence_check";

alter table "public"."weekly_check_ins" add constraint "weekly_check_ins_sleep_quality_check" CHECK (((sleep_quality >= 1) AND (sleep_quality <= 10))) not valid;

alter table "public"."weekly_check_ins" validate constraint "weekly_check_ins_sleep_quality_check";

alter table "public"."weekly_check_ins" add constraint "weekly_check_ins_stress_levels_check" CHECK (((stress_levels >= 1) AND (stress_levels <= 10))) not valid;

alter table "public"."weekly_check_ins" validate constraint "weekly_check_ins_stress_levels_check";

alter table "public"."weekly_check_ins" add constraint "weekly_check_ins_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."weekly_check_ins" validate constraint "weekly_check_ins_user_id_fkey";

alter table "public"."weekly_check_ins" add constraint "weekly_check_ins_user_id_week_start_date_key" UNIQUE using index "weekly_check_ins_user_id_week_start_date_key";

alter table "public"."weekly_check_ins" add constraint "weekly_check_ins_workout_completion_check" CHECK ((workout_completion >= 0)) not valid;

alter table "public"."weekly_check_ins" validate constraint "weekly_check_ins_workout_completion_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.update_weekly_check_ins_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

grant delete on table "public"."user_exercise_preferences" to "anon";

grant insert on table "public"."user_exercise_preferences" to "anon";

grant references on table "public"."user_exercise_preferences" to "anon";

grant select on table "public"."user_exercise_preferences" to "anon";

grant trigger on table "public"."user_exercise_preferences" to "anon";

grant truncate on table "public"."user_exercise_preferences" to "anon";

grant update on table "public"."user_exercise_preferences" to "anon";

grant delete on table "public"."user_exercise_preferences" to "authenticated";

grant insert on table "public"."user_exercise_preferences" to "authenticated";

grant references on table "public"."user_exercise_preferences" to "authenticated";

grant select on table "public"."user_exercise_preferences" to "authenticated";

grant trigger on table "public"."user_exercise_preferences" to "authenticated";

grant truncate on table "public"."user_exercise_preferences" to "authenticated";

grant update on table "public"."user_exercise_preferences" to "authenticated";

grant delete on table "public"."user_exercise_preferences" to "service_role";

grant insert on table "public"."user_exercise_preferences" to "service_role";

grant references on table "public"."user_exercise_preferences" to "service_role";

grant select on table "public"."user_exercise_preferences" to "service_role";

grant trigger on table "public"."user_exercise_preferences" to "service_role";

grant truncate on table "public"."user_exercise_preferences" to "service_role";

grant update on table "public"."user_exercise_preferences" to "service_role";

grant delete on table "public"."weekly_check_ins" to "anon";

grant insert on table "public"."weekly_check_ins" to "anon";

grant references on table "public"."weekly_check_ins" to "anon";

grant select on table "public"."weekly_check_ins" to "anon";

grant trigger on table "public"."weekly_check_ins" to "anon";

grant truncate on table "public"."weekly_check_ins" to "anon";

grant update on table "public"."weekly_check_ins" to "anon";

grant delete on table "public"."weekly_check_ins" to "authenticated";

grant insert on table "public"."weekly_check_ins" to "authenticated";

grant references on table "public"."weekly_check_ins" to "authenticated";

grant select on table "public"."weekly_check_ins" to "authenticated";

grant trigger on table "public"."weekly_check_ins" to "authenticated";

grant truncate on table "public"."weekly_check_ins" to "authenticated";

grant update on table "public"."weekly_check_ins" to "authenticated";

grant delete on table "public"."weekly_check_ins" to "service_role";

grant insert on table "public"."weekly_check_ins" to "service_role";

grant references on table "public"."weekly_check_ins" to "service_role";

grant select on table "public"."weekly_check_ins" to "service_role";

grant trigger on table "public"."weekly_check_ins" to "service_role";

grant truncate on table "public"."weekly_check_ins" to "service_role";

grant update on table "public"."weekly_check_ins" to "service_role";

create policy "Users can delete own exercise preferences"
on "public"."user_exercise_preferences"
as permissive
for delete
to public
using ((auth.uid() = user_id));


create policy "Users can insert own exercise preferences"
on "public"."user_exercise_preferences"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "Users can update own exercise preferences"
on "public"."user_exercise_preferences"
as permissive
for update
to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));


create policy "Users can view own exercise preferences"
on "public"."user_exercise_preferences"
as permissive
for select
to public
using ((auth.uid() = user_id));


create policy "weekly_check_ins_user_policy"
on "public"."weekly_check_ins"
as permissive
for all
to public
using ((auth.uid() = user_id));


CREATE TRIGGER handle_user_exercise_preferences_updated_at BEFORE UPDATE ON public.user_exercise_preferences FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER weekly_check_ins_updated_at BEFORE UPDATE ON public.weekly_check_ins FOR EACH ROW EXECUTE FUNCTION update_weekly_check_ins_updated_at();


