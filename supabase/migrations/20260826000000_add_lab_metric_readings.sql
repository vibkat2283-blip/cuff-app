-- Backs the Lab tab's new "Details" sub-tab: a full lab panel (Complete
-- Blood Count, Glucose/Metabolic, Lipids, Liver, Kidney, Thyroid,
-- Nutritional, Inflammation, Other -- ~46 individual metrics) where a
-- patient can log a new dated value per metric and see the latest one.
--
-- One flexible table rather than 46 columns or 46 tables: `metric_key`
-- identifies which of the app's LAB_DETAIL_SECTIONS metrics a row belongs
-- to (e.g. "hb", "ldl_c", "egfr"). `value` is free text, not numeric --
-- lab results come in wildly different formats (ratios, units, "<5"
-- qualifiers) and this table isn't charted, only shown as latest-value +
-- date, so there's no need to force a single numeric type.
--
-- Only patients write their own rows here (matching every other
-- patient-logged table in this app -- bp_readings, sugar_readings, etc.);
-- doctors can read but not insert.

create table if not exists public.lab_metric_readings (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  metric_key text not null,
  value text not null,
  created_at timestamptz not null default now()
);

create index if not exists lab_metric_readings_patient_metric_idx
  on public.lab_metric_readings (patient_id, metric_key, created_at);

alter table public.lab_metric_readings enable row level security;

create policy "authenticated users can view lab metric readings"
  on public.lab_metric_readings for select
  to authenticated
  using (true);

create policy "patients can insert their own lab metric readings"
  on public.lab_metric_readings for insert
  to authenticated
  with check (patient_id = auth.uid());
