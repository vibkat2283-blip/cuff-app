-- Backs appointment booking on the Doctor tab's new "Appointments"
-- sub-tab: a doctor opens time slots, patients browse a chosen doctor's
-- open slots and book one.
--
-- One row per slot. status flips between 'open' and 'booked'; booking
-- fills patient_id + booked_at, cancelling clears them back to 'open'
-- rather than deleting the row, so the same slot can be rebooked.
--
-- Concurrency: the app's booking call does
--   update ... where id = :id and status = 'open'
-- so if two patients race for the same slot, only the first update
-- actually matches a row -- the second gets zero rows back and the app
-- treats that as "someone else just booked it."
--
-- RLS follows this app's existing loose model (see prior migrations):
-- any authenticated user can select, a doctor can only insert/delete
-- slots under their own doctor_id, and update is left open to any
-- authenticated user so both booking (patient) and cancelling (either
-- side) work -- there's no per-row ownership check on update beyond the
-- conditional status match the app already does at the query level.

create table if not exists public.appointment_slots (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.profiles(id) on delete cascade,
  patient_id uuid references public.profiles(id) on delete set null,
  slot_start timestamptz not null,
  slot_end timestamptz not null,
  status text not null default 'open' check (status in ('open', 'booked')),
  booked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists appointment_slots_doctor_start_idx
  on public.appointment_slots (doctor_id, slot_start);
create index if not exists appointment_slots_patient_idx
  on public.appointment_slots (patient_id);

alter table public.appointment_slots enable row level security;

create policy "authenticated users can view appointment slots"
  on public.appointment_slots for select
  to authenticated
  using (true);

create policy "doctors can create their own slots"
  on public.appointment_slots for insert
  to authenticated
  with check (doctor_id = auth.uid());

create policy "doctors can delete their own slots"
  on public.appointment_slots for delete
  to authenticated
  using (doctor_id = auth.uid());

create policy "authenticated users can book or cancel a slot"
  on public.appointment_slots for update
  to authenticated
  using (true)
  with check (true);
