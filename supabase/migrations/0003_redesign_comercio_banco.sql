-- 0003_redesign_comercio_banco.sql
-- Rediseño: separar COMERCIO (dónde comprás) de BANCO_BILLETERA (con qué pagás).
-- Datos actuales son demo/descartables: DROP & CREATE.

create extension if not exists vector;

-- Limpieza de versiones viejas para evitar conflicto de firma.
drop function if exists match_promos(vector, int, text, text);
drop function if exists match_promos(vector, int, text);
drop function if exists match_promos(vector, int);
drop function if exists promos_by_banco(text);

drop table if exists promos cascade;

create table promos (
  id             uuid primary key default gen_random_uuid(),
  comercio       text not null,        -- dónde comprás
  banco_billetera text not null,       -- con qué pagás
  rubro          text,
  titulo         text,
  descripcion    text,
  descuento_pct  int,
  medio_pago     text,                 -- detalle ("18 cuotas sin interés", "tarjeta crédito")
  dias           text[],
  tope_reintegro text,
  fecha_desde    date,
  fecha_hasta    date,
  fuente_url     text,
  content        text,
  content_hash   text unique,
  embedding      vector(1536),
  created_at     timestamptz default now()
);

create index promos_embedding_hnsw_idx
  on promos using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- RPC: búsqueda vectorial con filtros opcionales por banco y comercio.
create function match_promos(
  query_embedding vector(1536),
  match_count int,
  filtro_banco text default null,
  filtro_comercio text default null
)
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
  created_at timestamptz,
  similarity float
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
    p.created_at,
    1 - (p.embedding <=> query_embedding) as similarity
  from promos p
  where (p.fecha_hasta is null or p.fecha_hasta >= current_date)
    and (filtro_banco is null or lower(p.banco_billetera) like lower('%' || filtro_banco || '%'))
    and (filtro_comercio is null or lower(p.comercio) like lower('%' || filtro_comercio || '%'))
  order by p.embedding <=> query_embedding
  limit match_count;
$$;

-- RPC: todas las promos vigentes de un banco, sin vector search, ordenadas por comercio.
create function promos_by_banco(filtro_banco text)
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
    and lower(p.banco_billetera) like lower('%' || filtro_banco || '%')
  order by p.comercio;
$$;

grant select, insert, update, delete on promos to service_role;
