-- Doctor-set recommended targets for the Lab tab's Blood pressure,
-- Fasting/Non-fasting/A1C sugar sections, plus the Home/weight-history
-- Body weight section. Same model as
-- 20260824030000_add_activity_recommended_targets.sql: a Doctor writes
-- these onto the PATIENT's profile row, patients see them read-only as a
-- reference line on the bar charts.

alter table public.profiles
  add column if not exists recommended_weight_kg numeric,
  add column if not exists recommended_bp_systolic integer,
  add column if not exists recommended_bp_diastolic integer,
  add column if not exists recommended_sugar_fasting integer,
  add column if not exists recommended_sugar_nonfasting integer,
  add column if not exists recommended_sugar_a1c numeric;
