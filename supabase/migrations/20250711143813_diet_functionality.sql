create table "public"."user_diet_plans" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "daily_calories" integer not null,
    "daily_protein_g" numeric(6,2) not null,
    "daily_carbs_g" numeric(6,2) not null,
    "daily_fat_g" numeric(6,2) not null,
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."user_diet_plans" enable row level security;

create table "public"."user_weight_history" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "weight_kg" numeric(5,2) not null,
    "measurement_date" date not null default CURRENT_DATE,
    "created_at" timestamp with time zone default now()
);


alter table "public"."user_weight_history" enable row level security;

alter table "public"."user_profiles" drop column "weight_kg";

alter table "public"."user_profiles" add column "target_weight_kg" numeric(5,2);

CREATE UNIQUE INDEX user_diet_plans_pkey ON public.user_diet_plans USING btree (id);

CREATE UNIQUE INDEX user_diet_plans_unique_active ON public.user_diet_plans USING btree (user_id) WHERE (is_active = true);

CREATE UNIQUE INDEX user_weight_history_pkey ON public.user_weight_history USING btree (id);

CREATE UNIQUE INDEX user_weight_history_unique_date ON public.user_weight_history USING btree (user_id, measurement_date);

alter table "public"."user_diet_plans" add constraint "user_diet_plans_pkey" PRIMARY KEY using index "user_diet_plans_pkey";

alter table "public"."user_weight_history" add constraint "user_weight_history_pkey" PRIMARY KEY using index "user_weight_history_pkey";

alter table "public"."user_diet_plans" add constraint "user_diet_plans_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_diet_plans" validate constraint "user_diet_plans_user_id_fkey";

alter table "public"."user_weight_history" add constraint "user_weight_history_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_weight_history" validate constraint "user_weight_history_user_id_fkey";

grant delete on table "public"."user_diet_plans" to "anon";

grant insert on table "public"."user_diet_plans" to "anon";

grant references on table "public"."user_diet_plans" to "anon";

grant select on table "public"."user_diet_plans" to "anon";

grant trigger on table "public"."user_diet_plans" to "anon";

grant truncate on table "public"."user_diet_plans" to "anon";

grant update on table "public"."user_diet_plans" to "anon";

grant delete on table "public"."user_diet_plans" to "authenticated";

grant insert on table "public"."user_diet_plans" to "authenticated";

grant references on table "public"."user_diet_plans" to "authenticated";

grant select on table "public"."user_diet_plans" to "authenticated";

grant trigger on table "public"."user_diet_plans" to "authenticated";

grant truncate on table "public"."user_diet_plans" to "authenticated";

grant update on table "public"."user_diet_plans" to "authenticated";

grant delete on table "public"."user_diet_plans" to "service_role";

grant insert on table "public"."user_diet_plans" to "service_role";

grant references on table "public"."user_diet_plans" to "service_role";

grant select on table "public"."user_diet_plans" to "service_role";

grant trigger on table "public"."user_diet_plans" to "service_role";

grant truncate on table "public"."user_diet_plans" to "service_role";

grant update on table "public"."user_diet_plans" to "service_role";

grant delete on table "public"."user_weight_history" to "anon";

grant insert on table "public"."user_weight_history" to "anon";

grant references on table "public"."user_weight_history" to "anon";

grant select on table "public"."user_weight_history" to "anon";

grant trigger on table "public"."user_weight_history" to "anon";

grant truncate on table "public"."user_weight_history" to "anon";

grant update on table "public"."user_weight_history" to "anon";

grant delete on table "public"."user_weight_history" to "authenticated";

grant insert on table "public"."user_weight_history" to "authenticated";

grant references on table "public"."user_weight_history" to "authenticated";

grant select on table "public"."user_weight_history" to "authenticated";

grant trigger on table "public"."user_weight_history" to "authenticated";

grant truncate on table "public"."user_weight_history" to "authenticated";

grant update on table "public"."user_weight_history" to "authenticated";

grant delete on table "public"."user_weight_history" to "service_role";

grant insert on table "public"."user_weight_history" to "service_role";

grant references on table "public"."user_weight_history" to "service_role";

grant select on table "public"."user_weight_history" to "service_role";

grant trigger on table "public"."user_weight_history" to "service_role";

grant truncate on table "public"."user_weight_history" to "service_role";

grant update on table "public"."user_weight_history" to "service_role";


