-- Consultas del embudo del Atlas.
--
-- Pegar en el SQL Editor de Supabase. Cada bloque es independiente.
-- Se corresponden con la tabla de metricas de LANZAMIENTO.md, seccion 2.
--
-- Aviso sobre "visitantes": aqui se cuentan SESIONES, no personas. Una misma
-- persona que vuelve manana cuenta dos veces, y si abre dos pestanas cuenta
-- dos veces el mismo dia. Sin cookies no se puede hacer mejor, y para decidir
-- si hay interes la sesion es una unidad suficientemente buena.


-- ---------------------------------------------------------------------------
-- 1. EL EMBUDO COMPLETO, ultimos 30 dias
--    La consulta principal. Responde: de los que entran, cuantos llegan a
--    cada paso.
-- ---------------------------------------------------------------------------
with ventana as (
  select * from public.eventos
  where creado_en >= now() - interval '30 days'
)
select
  'Sesiones'                as paso, count(distinct sesion_id) as sesiones, 1 as orden
  from ventana
union all
select
  'Abren >= 1 ficha',       count(distinct sesion_id), 2
  from ventana where nombre = 'ficha_abierta'
union all
select
  'Abren >= 3 fichas',      count(*), 3 from (
    select sesion_id from ventana
    where nombre = 'ficha_abierta'
    group by sesion_id having count(*) >= 3
  ) t
union all
select
  'Chocan con el muro',     count(distinct sesion_id), 4
  from ventana where nombre = 'muro_visto'
union all
select
  'Dejan el email',         count(distinct sesion_id), 5
  from ventana where nombre = 'email_capturado'
union all
select
  'Pulsan Suscribirse',     count(distinct sesion_id), 6
  from ventana where nombre = 'click_suscribir'
union all
select
  'Llegan a Stripe',        count(distinct sesion_id), 7
  from ventana where nombre = 'checkout_iniciado'
order by orden;


-- ---------------------------------------------------------------------------
-- 2. EL MISMO EMBUDO EN PORCENTAJE SOBRE LAS SESIONES
--    Es lo que hay que comparar con los objetivos del plan
--    (>40 % abren ficha, >15 % abren 3+).
-- ---------------------------------------------------------------------------
with ventana as (
  select * from public.eventos
  where creado_en >= now() - interval '30 days'
),
total as (select count(distinct sesion_id)::numeric as n from ventana)
select
  e.nombre,
  count(distinct e.sesion_id)                                   as sesiones,
  round(100 * count(distinct e.sesion_id) / nullif(t.n, 0), 1)  as pct_de_sesiones
from ventana e cross join total t
group by e.nombre, t.n
order by sesiones desc;


-- ---------------------------------------------------------------------------
-- 3. EN QUE FICHA CHOCA LA GENTE CON EL MURO
--    Si la mayoria choca en la primera, el muro esta demasiado pronto y el
--    SEO no va a despegar nunca. Este dato decide la Fase 1.2.
-- ---------------------------------------------------------------------------
select
  (datos->>'fichas_vistas')::int as ficha_numero,
  count(*)                       as veces
from public.eventos
where nombre = 'muro_visto'
  and datos ? 'fichas_vistas'
  and creado_en >= now() - interval '30 days'
group by 1
order by 1;


-- ---------------------------------------------------------------------------
-- 4. QUE MODELOS INTERESAN
--    Sirve para elegir sobre que escribir en redes y que fichas mandar a
--    indexar primero.
-- ---------------------------------------------------------------------------
select
  datos->>'modelo'  as modelo,
  datos->>'escuela' as escuela,
  count(*)          as aperturas
from public.eventos
where nombre = 'ficha_abierta'
  and creado_en >= now() - interval '30 days'
group by 1, 2
order by aperturas desc
limit 40;


-- ---------------------------------------------------------------------------
-- 5. QUE ESCUELAS INTERESAN
-- ---------------------------------------------------------------------------
select
  coalesce(datos->>'escuela', '(sin escuela)') as escuela,
  count(*)                                    as aperturas,
  count(distinct sesion_id)                   as sesiones
from public.eventos
where nombre = 'ficha_abierta'
  and creado_en >= now() - interval '30 days'
group by 1
order by aperturas desc;


-- ---------------------------------------------------------------------------
-- 6. POR DONDE ENTRA LA GENTE AL ATLAS
--    Cual de las cuatro vistas atrae. Si una no se usa nunca, sobra.
-- ---------------------------------------------------------------------------
select
  datos->>'vista'  as vista,
  datos->>'origen' as desde,
  count(*)         as veces
from public.eventos
where nombre = 'vista_elegida'
  and creado_en >= now() - interval '30 days'
group by 1, 2
order by veces desc;


-- ---------------------------------------------------------------------------
-- 7. ACTIVIDAD POR DIA
--    Para ver si una publicacion en redes o un boletin ha movido algo.
-- ---------------------------------------------------------------------------
select
  date_trunc('day', creado_en)::date as dia,
  count(distinct sesion_id)          as sesiones,
  count(*) filter (where nombre = 'ficha_abierta')    as fichas_abiertas,
  count(*) filter (where nombre = 'email_capturado')  as emails,
  count(*) filter (where nombre = 'checkout_iniciado') as checkouts
from public.eventos
where creado_en >= now() - interval '60 days'
group by 1
order by 1 desc;


-- ---------------------------------------------------------------------------
-- 8. DE DONDE LLEGA LA GENTE
--    El referrer de la primera pagina de cada sesion.
-- ---------------------------------------------------------------------------
select
  case
    when referrer is null or referrer = '' then '(directo o sin referrer)'
    else split_part(split_part(referrer, '://', 2), '/', 1)
  end                       as procedencia,
  count(distinct sesion_id) as sesiones
from public.eventos
where creado_en >= now() - interval '30 days'
group by 1
order by sesiones desc
limit 30;


-- ---------------------------------------------------------------------------
-- 9. LISTA DE ESPERA: cuantos, de donde y quienes son
--    El numero que decide si hay interes. Objetivo del plan: 300 a 8 semanas.
-- ---------------------------------------------------------------------------
select count(*) as emails_totales from public.lista_espera;

select
  origen,
  count(*) as emails
from public.lista_espera
group by origen
order by emails desc;

select
  coalesce(perfil, '(sin responder)') as perfil,
  count(*)                            as emails,
  round(100.0 * count(*) / sum(count(*)) over (), 1) as pct
from public.lista_espera
group by 1
order by emails desc;

select
  date_trunc('week', created_at)::date as semana,
  count(*)                             as altas
from public.lista_espera
group by 1
order by 1 desc;


-- ---------------------------------------------------------------------------
-- 10. MANTENIMIENTO
--     La tabla de eventos crece sola. Con poco trafico no importa, pero
--     conviene revisarla de vez en cuando y borrar lo viejo.
-- ---------------------------------------------------------------------------
select
  count(*)                                     as filas,
  pg_size_pretty(pg_total_relation_size('public.eventos')) as tamano,
  min(creado_en)::date                         as desde
from public.eventos;

-- Borrar eventos de mas de un ano (ejecutar a mano cuando haga falta):
-- delete from public.eventos where creado_en < now() - interval '365 days';
