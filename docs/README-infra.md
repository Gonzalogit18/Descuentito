# Infraestructura Descuentito - Guia de despliegue

Guia corta para levantar la base de datos, la Edge Function opcional y la
ingesta en n8n. Hace falta una cuenta de **Supabase**, una key de **OpenAI** y
una instancia de **n8n** (cloud o self-hosted).

---

## 1. Aplicar las migraciones (Supabase)

Las migraciones estan en `supabase/migrations/` y se aplican **en orden**:

1. `0001_init.sql` - extensiones, tabla `promos`, indices, trigger y el RPC
   `match_promos`.
2. `0002_cleanup_cron.sql` - funcion de limpieza + job diario con pg_cron.

### Opcion A - SQL Editor (Dashboard)

1. Supabase Dashboard -> **SQL Editor**.
2. Antes que nada, habilitar extensiones en **Database -> Extensions**:
   - `vector` (pgvector)
   - `pg_cron` (necesaria para `0002`; si no la habilitas, ver nota abajo).
3. Pegar y ejecutar **primero** el contenido de `0001_init.sql`.
4. Pegar y ejecutar **despues** el contenido de `0002_cleanup_cron.sql`.

### Opcion B - Supabase CLI

```bash
supabase link --project-ref <TU_PROJECT_REF>
supabase db push     # aplica los .sql de supabase/migrations en orden
```

> **pg_cron**: si no podes/queres habilitarlo, comenta el bloque
> `cron.schedule(...)` en `0002`. No es crítico: `match_promos` ya filtra las
> promos vencidas en cada consulta (expiry blando). El cron es solo higiene de
> la tabla.

---

## 2. Desplegar la Edge Function `ask` (opcional)

`supabase/functions/ask/index.ts` es un endpoint RAG de referencia. La app
Next.js trae su propia route, asi que esta function es **opcional**.

```bash
# Setear secrets (OPENAI; SUPABASE_URL y SERVICE_ROLE suelen inyectarse solos)
supabase secrets set OPENAI_API_KEY=sk-...

# Deploy
supabase functions deploy ask --no-verify-jwt
```

Invocacion:

```bash
curl -X POST https://<PROJECT_REF>.supabase.co/functions/v1/ask \
  -H "Content-Type: application/json" \
  -d '{"question":"¿Que descuentos hay hoy en Farmacity?"}'
```

---

## 3. Importar el workflow de n8n

1. Abrir n8n -> menu **Import from File**.
2. Elegir `n8n/descuentito-ingest-workflow.json`.
3. Configurar credenciales en n8n:
   - **OpenAI account** (para extraccion + embeddings).
   - **Supabase Descuentito** (URL del proyecto + service role key, para el UPSERT).
4. Editar el nodo **HTTP Request** con la URL real de cada fuente (ver
   `docs/fuentes-matriz.md`). Para sitios con anti-bot, apuntar a ScrapingBee/
   ScraperAPI con `render_js=true`.
5. Activar el workflow (Schedule Trigger diario ~06:00).

---

## 4. Variables de entorno / secrets (resumen)

| Variable                       | Dónde se usa                         | Notas |
|--------------------------------|--------------------------------------|-------|
| `OPENAI_API_KEY`               | Edge Function `ask` + n8n            | Embeddings (text-embedding-3-small) y chat (gpt-4o-mini). |
| `SUPABASE_URL`                 | Edge Function `ask` + n8n            | URL del proyecto. En Edge Functions suele inyectarse solo. |
| `SUPABASE_SERVICE_ROLE_KEY`    | Edge Function `ask` + n8n (UPSERT)   | Key privilegiada, SOLO server-side. Nunca exponer al cliente. |
| `SCRAPINGBEE_API_KEY` (opc.)   | n8n (HTTP Request)                   | Solo si se usa ScrapingBee/ScraperAPI para anti-bot. |

> La app Next.js (en el root, gestionada por otro agente) tendra ademas su
> propio `SUPABASE_ANON_KEY` para lecturas desde el cliente. La service role key
> y la OPENAI key viven solo del lado del servidor.

---

## Orden recomendado de puesta en marcha

1. Habilitar extensiones (`vector`, `pg_cron`) en el Dashboard.
2. Aplicar `0001_init.sql` y luego `0002_cleanup_cron.sql`.
3. (Opcional) Deploy de la Edge Function `ask`.
4. Importar y configurar el workflow de n8n; completar `fuentes-matriz.md`.
5. Cargar las primeras fuentes y ejecutar el workflow manualmente para validar
   que la tabla `promos` se llena con embeddings.
