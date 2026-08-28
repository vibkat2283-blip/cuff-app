-- Backs the Lab tab's new "Upload" sub-tab: patients upload a PDF or photo
-- of a lab report, doctors (and the patient) can view what's been uploaded.
--
-- Files live in a private Storage bucket (`lab-reports`); the app fetches a
-- short-lived signed URL on demand rather than exposing a public URL, since
-- these are medical documents. Metadata lives in `lab_reports`.
--
-- Same access model as messages/prescriptions/the recommended-target
-- columns elsewhere in this app: any authenticated account -- in practice
-- any Doctor -- can read/write any patient's rows and files. There's no
-- doctor-patient assignment enforced at the database level yet.

insert into storage.buckets (id, name, public)
values ('lab-reports', 'lab-reports', false)
on conflict (id) do nothing;

create policy "authenticated users can view lab report files"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'lab-reports');

create policy "authenticated users can upload lab report files"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'lab-reports');

create table if not exists public.lab_reports (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  content_type text,
  created_at timestamptz not null default now()
);

create index if not exists lab_reports_patient_id_created_at_idx
  on public.lab_reports (patient_id, created_at);

alter table public.lab_reports enable row level security;

create policy "authenticated users can view lab reports"
  on public.lab_reports for select
  to authenticated
  using (true);

create policy "authenticated users can insert lab reports as themselves"
  on public.lab_reports for insert
  to authenticated
  with check (uploaded_by = auth.uid());
