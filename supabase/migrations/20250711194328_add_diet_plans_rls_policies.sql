create policy "Users can delete own diet plans"
on "public"."user_diet_plans"
as permissive
for delete
to public
using ((auth.uid() = user_id));


create policy "Users can insert own diet plans"
on "public"."user_diet_plans"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "Users can update own diet plans"
on "public"."user_diet_plans"
as permissive
for update
to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));


create policy "Users can view own diet plans"
on "public"."user_diet_plans"
as permissive
for select
to public
using ((auth.uid() = user_id));


create policy "Users can insert own weight history"
on "public"."user_weight_history"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "Users can view own weight history"
on "public"."user_weight_history"
as permissive
for select
to public
using ((auth.uid() = user_id));



