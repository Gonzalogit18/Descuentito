-- =====================================================================
-- 0002_cleanup_cron.sql  |  Descuentito - limpieza diaria de promos
-- =====================================================================
-- Programa un job diario con pg_cron que borra las promos vencidas
-- (fecha_hasta < hoy) para mantener la tabla chica y los indices sanos.
--
-- Aplicar DESPUES de 0001_init.sql.
-- =====================================================================


-- ---------------------------------------------------------------------
-- Requisito: pg_cron
-- ---------------------------------------------------------------------
-- IMPORTANTE: pg_cron debe estar HABILITADO en el proyecto Supabase.
--   En el Dashboard: Database -> Extensions -> habilitar "pg_cron".
--   (En self-hosted / con permisos suficientes, el create de abajo basta.)
create extension if not exists pg_cron;


-- ---------------------------------------------------------------------
-- Funcion de limpieza
-- ---------------------------------------------------------------------
-- Encapsulamos el DELETE en una funcion para que el cron sea legible y
-- para poder ejecutarla manualmente (select public.cleanup_promos_vencidas();).
create or replace function public.cleanup_promos_vencidas()
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  delete from public.promos
  where fecha_hasta is not null
    and fecha_hasta < current_date;
$$;

comment on function public.cleanup_promos_vencidas() is
  'Borra promos cuya fecha_hasta ya paso (vencidas).';


-- ---------------------------------------------------------------------
-- Job diario con pg_cron
-- ---------------------------------------------------------------------
-- Corre todos los dias a las 05:00 UTC (~02:00 ART) antes de la ingesta
-- matinal de n8n (~06:00 ART). Cron format: min hora dia mes diasem.
--
-- Nota: cron.schedule es idempotente por nombre de job en versiones
-- recientes de pg_cron; si tu version no lo es, podes desprogramar antes:
--   select cron.unschedule('descuentito-cleanup-vencidas');
select cron.schedule(
  'descuentito-cleanup-vencidas',          -- nombre del job
  '0 5 * * *',                             -- 05:00 UTC, todos los dias
  $$ select public.cleanup_promos_vencidas(); $$
);


-- ---------------------------------------------------------------------
-- ALTERNATIVA (sin pg_cron): expiry "blando" en query-time
-- ---------------------------------------------------------------------
-- Si no se puede / no se quiere usar pg_cron, NO es estrictamente
-- necesario borrar: match_promos (0001) ya filtra
--     (fecha_hasta is null or fecha_hasta >= current_date)
-- por lo que las promos vencidas nunca se devuelven al usuario.
-- El cron es solo higiene de la tabla (tamano + recall del indice).
-- En ese caso, comenta el bloque cron.schedule(...) de arriba.
