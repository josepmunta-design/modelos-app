-- Eventos del embudo del Atlas.
-- Los envia public/assets/track.js por lotes a api/track.js, que escribe aqui
-- con el service role. Ver LANZAMIENTO.md, seccion 0.1.
--
-- No se guarda ningun dato personal: ni email, ni IP, ni cookies. sesion_id es
-- un identificador aleatorio que vive en sessionStorage y muere al cerrar la
-- pestana; sirve solo para poder encadenar los pasos de una misma visita.
create table if not exists public.eventos (
  id bigserial primary key,
  nombre text not null,
  sesion_id text,
  ruta text,
  referrer text,
  datos jsonb not null default '{}'::jsonb,
  creado_en timestamptz not null default now()
);

create index if not exists eventos_nombre_creado_idx
  on public.eventos (nombre, creado_en desc);

create index if not exists eventos_sesion_idx
  on public.eventos (sesion_id);

create index if not exists eventos_creado_idx
  on public.eventos (creado_en desc);

alter table public.eventos enable row level security;

-- Sin policies: solo el service role escribe, desde el endpoint.
-- El navegador nunca habla directamente con esta tabla.
