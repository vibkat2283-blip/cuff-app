-- Structured family history fields on profiles, backing the Family history
-- sub-tab boxes (Diabetes, Hypertension, CAD/MI, Stroke, Cancer, Thyroid
-- disease, Kidney disease, Liver disease, Dementia/Memory loss, Obesity,
-- Longevity/Age at death). Freeform notes continue to use the existing
-- family_history column.

alter table public.profiles
  add column if not exists family_diabetes text,
  add column if not exists family_hypertension text,
  add column if not exists family_cad_mi text,
  add column if not exists family_stroke text,
  add column if not exists family_cancer text,
  add column if not exists family_thyroid_disease text,
  add column if not exists family_kidney_disease text,
  add column if not exists family_liver_disease text,
  add column if not exists family_dementia text,
  add column if not exists family_obesity text,
  add column if not exists family_longevity text;
