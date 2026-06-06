-- 0004_list_rpcs.sql
-- Nuevos RPCs para listar TODAS las promos vigentes que matchean un comercio o
-- un rubro, SIN límite de vector search (arregla el "solo aparecían algunas").
-- Idempotente: create or replace. Pegar tal cual en el SQL editor de Supabase.

-- Todas las promos vigentes de un COMERCIO (match case-insensitive ILIKE).
create or replace function promos_by_comercio(filtro_comercio text)
returns table (
  id uuid,
  comercio text,
  banco_billetera text,
  rubro text,
  titulo text,
  descripcion text,
  descuento_pct int,
  medio_pago text,
  dias text[],
  tope_reintegro text,
  fecha_desde date,
  fecha_hasta date,
  fuente_url text,
  content text,
  content_hash text,
  embedding vector(1536),
  created_at timestamptz
)
language sql stable
as $$
  select
    p.id,
    p.comercio,
    p.banco_billetera,
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
    p.content_hash,
    p.embedding,
    p.created_at
  from promos p
  where (p.fecha_hasta is null or p.fecha_hasta >= current_date)
    and p.comercio ilike '%' || filtro_comercio || '%'
  order by p.descuento_pct desc nulls last, p.comercio;
$$;

-- Todas las promos vigentes de un RUBRO (match case-insensitive ILIKE).
create or replace function promos_by_rubro(filtro_rubro text)
returns table (
  id uuid,
  comercio text,
  banco_billetera text,
  rubro text,
  titulo text,
  descripcion text,
  descuento_pct int,
  medio_pago text,
  dias text[],
  tope_reintegro text,
  fecha_desde date,
  fecha_hasta date,
  fuente_url text,
  content text,
  content_hash text,
  embedding vector(1536),
  created_at timestamptz
)
language sql stable
as $$
  select
    p.id,
    p.comercio,
    p.banco_billetera,
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
    p.content_hash,
    p.embedding,
    p.created_at
  from promos p
  where (p.fecha_hasta is null or p.fecha_hasta >= current_date)
    and p.rubro ilike '%' || filtro_rubro || '%'
  order by p.descuento_pct desc nulls last, p.comercio;
$$;

-- Conteo de promos vigentes por rubro (para las opciones de aclaración).
create or replace function promos_rubro_counts()
returns table (
  rubro text,
  total bigint
)
language sql stable
as $$
  select p.rubro, count(*) as total
  from promos p
  where (p.fecha_hasta is null or p.fecha_hasta >= current_date)
    and p.rubro is not null
  group by p.rubro
  order by total desc;
$$;
