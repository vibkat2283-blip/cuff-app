-- Doctor-set recommended targets for the Activity tab's Steps, Sleep,
-- Workout minutes, Cardio/Walk, and Daily heart rate sections. Patients see
-- these as a read-only reference line on the bar charts; only a Doctor
-- account can write them, and it writes onto the PATIENT's profile row
-- (not their own) since a target belongs to the patient being tracked.
--
-- IMPORTANT: this is the first place in the app where a Doctor-role client
-- updates a *different* user's row in `profiles` (every other profiles
-- write in this app targets the caller's own row). Make sure your RLS
-- update policy on profiles either scopes this to just these six columns
-- for callers with role='Doctor', or you're accepting that any
-- authenticated Doctor account can write these specific columns on any
-- patient's profile -- not arbitrary columns, since the app's own update
-- calls only ever send this fixed field set, but that's an app-level
-- guarantee, not a database-level one.

alter table public.profiles
  add column if not exists recommended_steps integer,
  add column if not exists recommended_sleep_hours numeric,
  add column if not exists recommended_workout_weight_minutes integer,
  add column if not exists recommended_workout_cardio_minutes integer,
  add column if not exists recommended_heart_rate_min integer,
  add column if not exists recommended_heart_rate_max integer;
