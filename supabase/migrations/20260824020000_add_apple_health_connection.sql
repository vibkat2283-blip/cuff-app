-- Tracks whether a profile has "connected" Apple Health from the new
-- Connect Sensor sub-tab. Note this only records connection intent/status --
-- Apple HealthKit has no web API, so actually syncing HealthKit data
-- requires a native iOS companion app or a third-party bridge (e.g. Terra,
-- Vital, Spike) that this schema does not yet implement.

alter table public.profiles
  add column if not exists apple_health_connected boolean not null default false,
  add column if not exists apple_health_connected_at timestamptz;
