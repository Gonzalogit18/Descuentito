-- =====================================================================
-- 0001_init.sql  |  Descuentito - esquema base + RAG
-- =====================================================================
-- Este migration crea la tabla de promociones, los indices vectoriales
-- y la funcion RPC de busqueda semantica (match_promos) usada por el
-- chat con RAG.
--
-- Orden de aplicacion: este es el PRIMER migration. Aplicar antes que
-- 0002_cleanup_cron.sql.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1) Extensiones
-- ---------------------------------------------------------------------
-- pgvector: provee el tipo `vector` y los operadores de distancia
-- (<=> coseno, <-> L2, <#> producto interno). Imprescindible para RAG.
create extension if not exists vector;

-- NOTA sobre pg_cron:
--   pg_cron se usa en 0002_cleanup_cron.sql para el borrado diario de
--   promos vencidas. En Supabase, pg_cron normalmente debe habilitarse
--   desde el Dashboard (Database -> Extensions -> pg_cron) o con:
--       create extension if not exists pg_cron;
--   En algunos proyectos requiere permisos de superusuario / habilitarlo
--   manualmente desde la consola del proyecto. Se documenta alli.


-- ---------------------------------------------------------------------
-- 2) Tabla principal: promos
-- ---------------------------------------------------------------------
-- Cada fila es una promocion canonica y "embebible".
--   - `content`     : texto humano-legible que SE EMBEBE (input del embedding).
--   - `embedding`   : vector de 1536 dims (OpenAI text-embedding-3-small).
--   - `content_hash`: hash deterministico para dedupe / upsert idempotente.
create table if not exists public.promos (
  id              uuid primary key default gen_random_uuid(),
  marca           text not null,                 -- p.ej. "Farmacity", "YPF"
  rubro           text,                          -- p.ej. "Farmacia", "Combustible"
  titulo          text,                          -- titulo corto de la promo
  descripcion     text,                          -- descripcion larga
  descuento_pct   numeric,                       -- porcentaje de descuento (ej 20)
  medio_pago      text,                          -- "Banco Galicia", "MODO", "Mercado Pago"...
  dias            text[],                        -- dias aplicables: {'lunes','martes'}
  tope_reintegro  text,                          -- tope de reintegro (texto libre, ej "$4000")
  fecha_desde     date,                          -- inicio de vigencia
  fecha_hasta     date,                          -- fin de vigencia (null = sin vencimiento conocido)
  fuente_url      text,                          -- URL de origen de la promo
  content         text not null,                 -- texto canonico que se embebe
  embedding       vector(1536),                  -- vector semantico (OpenAI 1536 dims)
  content_hash    text not null,                 -- hash deterministico para dedupe
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.promos is
  'Promociones bancarias/billeteras canonicas, con texto embebido para RAG.';

-- Restriccion UNIQUE sobre content_hash:
--   permite el UPSERT "on conflict (content_hash)" desde la ingesta n8n
--   y evita duplicados cuando la misma promo se scrapea varios dias.
alter table public.promos
  add constraint promos_content_hash_key unique (content_hash);


-- ---------------------------------------------------------------------
-- 3) Indices
-- ---------------------------------------------------------------------
-- Indice vectorial HNSW con distancia coseno: acelera el ORDER BY del
-- operador <=> en match_promos. HNSW da buen recall/latencia sin tuning.
create index if not exists promos_embedding_hnsw_idx
  on public.promos
  using hnsw (embedding vector_cosine_ops);

-- Indice btree por marca: filtros e ILIKE por marca son frecuentes.
create index if not exists promos_marca_idx
  on public.promos (marca);

-- Indice btree por fecha_hasta: el filtro de "no vencidas" y el cron de
-- limpieza consultan por esta columna.
create index if not exists promos_fecha_hasta_idx
  on public.promos (fecha_hasta);


-- ---------------------------------------------------------------------
-- 4) Trigger: mantener updated_at fresco en cada UPDATE
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  -- Cada vez que se actualiza una fila, refrescamos updated_at a "ahora".
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists promos_set_updated_at on public.promos;

create trigger promos_set_updated_at
  before update on public.promos
  for each row
  execute function public.set_updated_at();


-- ---------------------------------------------------------------------
-- 5) RPC: match_promos  (busqueda semantica para el RAG)
-- ---------------------------------------------------------------------
-- Devuelve las `match_count` promos mas cercanas al query_embedding por
-- distancia coseno (<=>), filtrando promos vencidas y, opcionalmente,
-- por marca (case-insensitive).
--
-- `similarity` = 1 - distancia_coseno  (1.0 = identico, 0 = ortogonal).
--
-- security definer + search_path fijo: recomendacion de Supabase para
-- funciones RPC, asi corren con permisos del owner y se evita el secuestro
-- del search_path. Se expone via PostgREST a los roles anon/authenticated.
create or replace function public.match_promos(
  query_embedding vector(1536),
  match_count     int  default 5,
  filtro_marca    text default null
)
returns table (
  id             uuid,
  marca          text,
  rubro          text,
  titulo         text,
  descripcion    text,
  descuento_pct  numeric,
  medio_pago     text,
  dias           text[],
  tope_reintegro text,
  fecha_desde    date,
  fecha_hasta    date,
  fuente_url     text,
  content        text,
  similarity     float
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    p.id,
    p.marca,
    p.rubro,
    p.titulo,
    p.descripcion,
    p.descuento_pct,
    p.medio_pago,
    p.dias,
    p.tope_reintegro,
    p.fecha_desde,
    p.fecha_hasta,
    p.fuente_url,
    p.content,
    -- 1 - distancia coseno => mayor es "mas parecido"
    1 - (p.embedding <=> query_embedding) as similarity
  from public.promos p
  where
    -- Solo promos vigentes: sin vencimiento o que vencen hoy o despues.
    (p.fecha_hasta is null or p.fecha_hasta >= current_date)
    -- Filtro opcional por marca (case-insensitive). Si filtro_marca es
    -- null, esta condicion es siempre verdadera.
    and (filtro_marca is null or p.marca ilike filtro_marca)
  order by p.embedding <=> query_embedding   -- ascendente: menor distancia primero
  limit match_count;
$$;

comment on function public.match_promos(vector, int, text) is
  'Busqueda semantica de promos vigentes por distancia coseno; filtro opcional por marca.';
