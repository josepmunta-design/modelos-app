-- Registro de emails que ya han consumido su prueba gratuita.
-- Lo escribe api/stripe-webhook.js (recordTrialUsage) cuando una suscripcion
-- nace en estado 'trialing'. Es idempotente: se inserta con
-- Prefer: resolution=ignore-duplicates.
create table if not exists public.trial_history (
  email_normalized text primary key,
  created_at timestamptz not null default now()
);

alter table public.trial_history enable row level security;

-- Sin policies: solo el service role (que las omite) accede a esta tabla.
-- Ningun cliente debe poder leer ni escribir aqui.
