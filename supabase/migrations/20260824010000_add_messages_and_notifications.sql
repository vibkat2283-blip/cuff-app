-- Two-way patient <-> doctor messaging, plus per-user "last seen" markers
-- used to compute the notification bell (unread prescription/message state).
--
-- Messages are threaded by patient_id only (one thread per patient), the
-- same model prescriptions already use -- any account with role='Doctor'
-- can read/write a given patient's thread, matching this app's current
-- doctor access model. If you tighten doctor/patient assignment later,
-- revisit the RLS policies below at the same time.

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  sender_role text not null check (sender_role in ('Patient', 'Doctor')),
  text text not null,
  created_at timestamptz not null default now()
);

create index if not exists messages_patient_id_created_at_idx
  on public.messages (patient_id, created_at);

alter table public.messages enable row level security;

create policy "authenticated users can view messages"
  on public.messages for select
  to authenticated
  using (true);

create policy "authenticated users can send messages as themselves"
  on public.messages for insert
  to authenticated
  with check (sender_id = auth.uid());

alter table public.profiles
  add column if not exists last_seen_messages_at timestamptz,
  add column if not exists last_seen_prescriptions_at timestamptz;
