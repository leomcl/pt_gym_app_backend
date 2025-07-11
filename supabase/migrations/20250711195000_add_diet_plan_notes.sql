-- Add notes column to user_diet_plans table to store reasoning behind calculations

ALTER TABLE "public"."user_diet_plans" 
ADD COLUMN "notes" text;