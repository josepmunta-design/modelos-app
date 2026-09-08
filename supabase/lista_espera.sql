-- Lista de espera / avisos del Atlas.
-- La escribe api/subscribe-list.js con el service role.
-- Ver LANZAMIENTO.md, seccion 0.2.
create table if not exists public.lista_espera (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  email_normalized text not null unique,
  origen text,            -- 'home' | 'muro' | 'ficha' | otro
  modelo_contexto text,   -- ficha desde la que se apunto, si aplica
  perfil text,            -- 'clinico' | 'docente' | 'estudiante' | 'otro'
  locale text not null default 'es',
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists lista_espera_created_at_idx
  on public.lista_espera (created_at desc);

create index if not exists lista_espera_origen_idx
  on public.lista_espera (origen);

alter table public.lista_espera enable row level security;

-- Sin policies: solo el service role escribe aqui, desde el endpoint.
-- El navegador nunca habla directamente con esta tabla, asi que no puede
-- volcarse la lista de emails desde el cliente.
