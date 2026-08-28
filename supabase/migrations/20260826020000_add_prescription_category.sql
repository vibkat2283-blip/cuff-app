-- Splits the Prescription sub-tab into Medicine and Supplements sections.
-- Existing rows have no category, so they need to default to 'medicine'
-- (the app's own client-side fallback already assumes this for rows
-- written before this migration, but backfilling here keeps the data
-- itself consistent rather than relying on that fallback forever).

alter table public.prescriptions
  add column if not exists category text not null default 'medicine' check (category in ('medicine', 'supplement'));
