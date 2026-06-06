# HANDOFF — Proyecto Descuentito

> Documento de traspaso exhaustivo. Esta es la fuente de verdad para cualquier desarrollador que retome el proyecto.
> Última actualización: 2026-06-06

---

## 1. Resumen Ejecutivo

**Descuentito** es una app móvil Android (Flutter) con un backend web (Next.js) que permite a usuarios argentinos hacer preguntas en lenguaje natural sobre descuentos bancarios y de billeteras virtuales vigentes. El usuario tipea algo como "¿Qué descuentos hay en Farmacity hoy?" y recibe una respuesta generada por IA mostrando las promociones activas de bancos/tarjetas/billeteras.

La interfaz tiene un diseño "Liquid Glass" futurista: fondo negro OLED, paneles de vidrio esmerilado, acento cyan eléctrico (#22d3ee), y una barra de comando central que sube al top con animación tipo Google al hacer la primera consulta.

**Propietario:** Gonzalo Castells
**Estado:** MVP funcionando localmente con IA real (OpenAI + Supabase). No desplegado en producción. Pipeline n8n funciona end-to-end con 12 promos reales de Mercado Pago.

**Stack resumido:**
- Frontend web: Next.js 14 + TypeScript + Tailwind + Framer Motion
- App: Flutter (Android)
- Base de datos: Supabase (PostgreSQL + pgvector)
- IA: OpenAI gpt-4o-mini + text-embedding-3-small
- Automatización: n8n (self-hosted en Hostinger/EasyPanel)

---

## 2. Estado Actual

### Lo que FUNCIONA hoy

| Componente | Estado | Notas |
|------------|--------|-------|
| Next.js app (localhost:3000) | FUNCIONA | RAG real con API keys, fallback mock sin keys |
| UI "command bar" | FUNCIONA | Animaciones, diseño Liquid Glass completo |
| API route /api/ask | FUNCIONA | Embeddings + pgvector + streaming GPT-4o-mini; detecta banco/comercio en pregunta |
| Mock fallback (sin keys) | FUNCIONA | 12 promos demo, matcher por keywords; alineado al nuevo schema |
| Supabase tabla promos | FUNCIONA | pgvector 1536 dims, HNSW index, RPC match_promos + nueva RPC promos_by_banco |
| Supabase datos | FUNCIONA | 12 promos REALES de Mercado Pago (Farmacity, Movistar, Despegar, Mercado Libre, Compra Gamer, Turismocity, Lenovo, Sony, Aerolíneas Argentinas, OnCity, La Parfumerie, Farmaonline) |
| Script seed (seed.mjs) | FUNCIONA | Siembra promos con embeddings reales; alineado al nuevo schema |
| Flutter — código | CORREGIDO | fromJson corregido, botón X implementado, flutter analyze pasa. Sin testear en emulador. |
| n8n workflow | FUNCIONA | Pipeline end-to-end con Mercado Pago; nuevo nodo "Config Fuente" |

### Lo que NO funciona / no está listo

| Componente | Estado | Prioridad |
|------------|--------|-----------|
| Web app con datos reales | NO TESTEADO | Alta — ¿responde bien sobre Farmacity con MP? |
| Flutter — ejecución | NO TESTEADO | Alta |
| Deploy (Vercel) | NO HECHO | Media |
| Clonar workflow a otros bancos | PENDIENTE | Media — BBVA, Galicia, MODO, Santander |
| Flutter fase 2: sección por banco | PENDIENTE | Media — usar promos_by_banco RPC |
| URL Flutter en producción | HARDCODEADA | Media (antes de deploy) — 10.0.2.2:3000 |
| Next.js security patch | PENDIENTE | Alta (vulnerabilidad 14.2.x conocida) |

---

## 3. Arquitectura

### Flujo de datos (intención de producción)

```
[n8n cron 6AM]
     |
     v
HTTP GET → fuente (MP, Galicia, MODO, etc.)
     |
     v
Limpiar HTML (Function node) → html_limpio: string
     |
     v
OpenAI gpt-4o-mini → extrae JSON estructurado de promos
     |
     v
Normalizar + content_hash → normaliza nombres de marcas, genera hash
     |
     v
OpenAI text-embedding-3-small → vector float[1536]
     |
     v
Supabase REST upsert → tabla promos (dedup por content_hash)
     
─────────────────────────────────────────────────────────

[Usuario abre Flutter app]
     |
     v
Tipea pregunta → POST /api/ask (Next.js)
     |
     v
OpenAI text-embedding-3-small → embed la pregunta
     |
     v
Supabase match_promos RPC → cosine similarity search (top 10)
     |
     v
GPT-4o-mini con contexto de promos → genera respuesta
     |
     v
Stream SSE → Flutter parsea protocolo meta:{json} + chunks
     |
     v
Flutter renderiza: texto IA + promo cards
```

### Protocolo de streaming personalizado

El endpoint /api/ask usa un protocolo de dos fases en el stream:

1. **Primera línea**: `meta:{json}` donde json = `{"source":"real"|"mock","promos":[...]}`
   - Contiene los objetos promo estructurados para renderizar las cards
2. **Líneas siguientes**: chunks de texto del stream de GPT-4o-mini (la respuesta en lenguaje natural)

Flutter espera y parsea este protocolo en `ask_service.dart`.

### Supabase match_promos RPC

```sql
match_promos(
  query_embedding vector(1536),
  match_count int,
  filtro_banco    text DEFAULT NULL,  -- opcional, filtra por banco_billetera
  filtro_comercio text DEFAULT NULL   -- opcional, filtra por comercio
)
```
- Ordena por distancia coseno (menor = más similar)
- Filtra promos vencidas con manejo null-safe de fechas
- Filtros de banco y comercio opcionales (NULL = buscar en todos)

### Supabase promos_by_banco RPC (nueva — 2026-06-06)

```sql
promos_by_banco(filtro_banco text)
```
- Devuelve todas las promos vigentes de un banco/billetera sin vector search
- Ordenadas por comercio
- Habilita la feature "todos los descuentos de mi tarjeta Galicia"

### Arquitectura multi-fuente: un workflow por banco

Cada banco/billetera tiene su propio workflow n8n (copia del template). Para clonar a otro banco:
1. Cambiar la URL en el nodo "HTTP Request" fuente
2. Cambiar el campo `banco_billetera` en el nodo **"Config Fuente"** (inyecta el banco de forma fija)

La IA extrae `comercio` automáticamente del HTML; el banco queda fijo por configuración del workflow.

---

## 4. Stack Tecnológico

### Web / Backend

| Tecnología | Versión | Uso |
|------------|---------|-----|
| Next.js | 14.2.35 | Framework web + API Routes (App Router) |
| TypeScript | 5.x | Lenguaje web |
| Tailwind CSS | 3.4.x | Estilos utilitarios |
| Framer Motion | 11.x | Animaciones (spring, layout) |
| Node.js | v24.16.0 | Runtime |
| npm | 11.x | Package manager |

### Base de datos

| Tecnología | Versión | Uso |
|------------|---------|-----|
| Supabase | Cloud | PostgreSQL hosting + Auth + API REST |
| PostgreSQL | 15.x | Base de datos relacional |
| pgvector | 0.5.x | Extension para embeddings vectoriales |

### IA / ML

| Servicio | Modelo | Uso |
|----------|--------|-----|
| OpenAI | text-embedding-3-small | Embeddings (1536 dims) — consultas y promos |
| OpenAI | gpt-4o-mini | Chat completion — respuestas al usuario y extracción en n8n |

### Mobile

| Tecnología | Versión | Uso |
|------------|---------|-----|
| Flutter | Stable | Framework mobile (Android) |
| Dart | 3.x | Lenguaje |
| http | ^1.2.0 | HTTP client para llamadas a API |
| shimmer | ^3.0.0 | Efecto shimmer en loading states |
| google_fonts | ^6.2.1 | Tipografías |

### Automatización

| Tecnología | Hosting | Uso |
|------------|---------|-----|
| n8n | Hostinger EasyPanel | Workflows de scraping e ingesta |

---

## 5. Estructura del Proyecto

```
Proyecto Descuentito/
├── app/
│   ├── api/
│   │   └── ask/
│   │       └── route.ts         # CORE: endpoint RAG (POST /api/ask)
│   ├── globals.css              # Sistema de diseño Liquid Glass
│   ├── layout.tsx               # Layout raíz con fondo animado ambient
│   └── page.tsx                 # UI principal (command bar + results)
│
├── components/
│   └── Logo.tsx                 # Logo mark: signo % en cyan
│
├── lib/
│   └── mock-promos.ts           # 12 promos demo + keyword matcher
│
├── scripts/
│   └── seed.mjs                 # Siembra Supabase con embeddings reales
│
├── flutter/                     # App Android (código completo, sin testear)
│   ├── pubspec.yaml             # Dependencias Flutter
│   ├── android/                 # Config Android nativa
│   └── lib/
│       ├── main.dart            # Entry point
│       ├── config/
│       │   └── api_config.dart  # URL base de la API (HARDCODEADA a emulador)
│       ├── models/
│       │   └── promo.dart       # Modelo de datos Promo
│       ├── services/
│       │   └── ask_service.dart # Llamada HTTP + parseo stream meta:{json}
│       ├── screens/
│       │   └── home_screen.dart # Pantalla principal
│       ├── widgets/
│       │   ├── animated_background.dart
│       │   ├── promo_card.dart
│       │   └── [otros widgets]
│       └── theme/
│           └── app_theme.dart   # Constantes de diseño
│
├── supabase/
│   ├── migrations/
│   │   ├── 0001_init.sql        # Tabla promos, pgvector, RPC match_promos
│   │   └── 0002_cleanup_cron.sql
│   └── functions/
│       └── ask/
│           └── index.ts         # Edge Function (referencia, no se usa)
│
├── n8n/
│   └── descuentito-ingest-workflow.json  # Workflow importable en n8n
│
├── docs/
│   ├── fuentes-matriz.md        # Investigación de fuentes de datos
│   └── README-infra.md          # Guía de setup de infraestructura
│
├── .env.local                   # Claves reales (NUNCA commitear)
├── .env.local.example           # Template de variables de entorno
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── next.config.ts
└── HANDOFF.md                   # Este archivo
```

### Archivos más importantes (leer primero)

1. `app/api/ask/route.ts` — toda la lógica de negocio del backend
2. `app/page.tsx` — UI principal con lógica de estado
3. `lib/mock-promos.ts` — datos de fallback + lógica de matching
4. `flutter/lib/services/ask_service.dart` — cliente Flutter del protocolo streaming
5. `n8n/descuentito-ingest-workflow.json` — workflow de ingesta
6. `supabase/migrations/0001_init.sql` — schema de base de datos

---

## 6. Funcionalidades Implementadas

### Web App

#### UI "Command Bar"
- Input centrado tipo Google con placeholder animado
- Al enviar la primera consulta: animación spring que sube la barra al top
- Estado de carga con animación de puntos
- Respuesta de IA streameada en tiempo real (texto aparece char a char)
- Cards de promos debajo de la respuesta con: marca, banco, descuento, fecha, condiciones

#### Diseño Liquid Glass
- Fondo #000000 con dos gradientes radiales animados (púrpura top-left, azul medianoche bottom-right)
- Paneles: rgba(255,255,255,0.05) con backdrop-filter blur(15px) saturate(150%)
- Bordes: rgba(255,255,255,0.1)
- Acento principal: #22d3ee (cyan eléctrico)
- Acento secundario: #e879f9 (magenta, uso esporádico)
- Tipografía: stack -apple-system

#### Backend RAG (/api/ask)
- Recibe pregunta en texto libre
- Embeds con text-embedding-3-small (1536 dims)
- Llama match_promos RPC en Supabase (cosine similarity, top 10)
- Si no hay promos reales, usa mock fallback automáticamente
- Construye prompt con contexto de promos encontradas
- Stream de gpt-4o-mini con protocolo meta:{json} + texto

#### Mock Fallback
- 12 promos demo en `lib/mock-promos.ts` (datos INVENTADOS pero plausibles)
- Matcher por keywords: extrae marcas de la pregunta y filtra promos relevantes
- Funciona sin ninguna API key configurada

### Flutter App (código listo, sin testear)

- UI idéntica al diseño web (Liquid Glass)
- Input centrado, mismo comportamiento de animación
- Streaming de respuesta: parsea primera línea meta:{json}, luego acumula chunks de texto
- Renderiza promo cards con los datos del meta
- Conecta a `http://10.0.2.2:3000/api/ask` (emulador Android → localhost)

### Base de Datos Supabase

- Tabla `promos` rediseñada: `comercio` (dónde comprás) + `banco_billetera` (con qué pagás), reemplazando los campos anteriores `marca`/`banco`
- Índice HNSW para búsqueda vectorial eficiente
- RPC `match_promos` con filtros `filtro_banco` y `filtro_comercio` (null-safe), y nueva RPC `promos_by_banco`
- 12 promos REALES de Mercado Pago seedeadas con embeddings reales

### Script de Seed

```bash
node scripts/seed.mjs
```
Siembra las 12 promos demo con embeddings reales de OpenAI. Hace upsert por content_hash (idempotente).

### n8n Workflow (funciona end-to-end con Mercado Pago)

Nodos implementados:
1. Schedule Trigger (cron 6AM)
2. HTTP Request → fuente web (URL configurable por banco)
3. Limpiar HTML (Function) → extrae texto relevante
4. **Config Fuente** (nuevo) → inyecta `banco_billetera` fijo para este workflow
5. HTTP Request → OpenAI gpt-4o-mini extracción de promos (extrae `comercio` + fechas en YYYY-MM-DD inferidas a año 2026)
6. Normalizar + content_hash (Function)
7. HTTP Request → OpenAI text-embedding-3-small
8. Armar fila final (Function)
9. HTTP Request → Supabase upsert

---

## 7. Funcionalidades Pendientes

### Alta Prioridad (bloquean uso real)

- [ ] **Testear web app con datos reales**: Verificar que el endpoint /api/ask responde correctamente usando las 12 promos reales de MP (ej: "¿Qué descuentos hay en Farmacity con Mercado Pago?").
- [ ] **Testear Flutter**: Ejecutar `flutter pub get && flutter run` y verificar que compila y se conecta al backend. El código fue corregido (fromJson, botón X) pero nunca ejecutado en emulador/dispositivo.
- [ ] **Parchear Next.js**: La versión 14.2.x tiene una vulnerabilidad de seguridad conocida. Actualizar a la versión parcheada más reciente.

### Media Prioridad (para MVP completo)

- [ ] **Deploy en Vercel**: El app Next.js no está desplegado. Ejecutar `vercel --prod` desde la raíz del proyecto y configurar las variables de entorno en Vercel dashboard.
- [ ] **URL de producción en Flutter**: `flutter/lib/config/api_config.dart` tiene la URL hardcodeada a `http://10.0.2.2:3000`. Después del deploy a Vercel, actualizar con la URL de producción. Para dispositivo físico (no emulador), usar la IP local obtenida con `ipconfig`.
- [ ] **Clonar workflow a otros bancos**: El template ya existe (Mercado Pago). Para cada banco: 1) copiar el workflow, 2) cambiar URL en HTTP Request fuente, 3) cambiar `banco_billetera` en nodo "Config Fuente". Bancos pendientes: BBVA, Banco Galicia, MODO, Santander.
- [ ] **Flutter fase 2 — sección "descuentos por banco"**: Usar la nueva RPC `promos_by_banco` para mostrar todos los descuentos de una tarjeta específica sin necesidad de búsqueda semántica.
- [ ] **Scraping Galicia**: Sitemap en sitemap-beneficios.xml con 600+ promos. Requiere JS rendering por cada promo individual. Nivel de dificultad: medio.
- [ ] **Scraping MODO**: `https://www.modo.com.ar/promos`. Requiere ScrapingBee u otra solución de JS rendering. Nivel: medio.
- [ ] **Scraping BBVA**: `/beneficios/campania.html?id=X`. Iterar IDs, requiere JS. Nivel: medio.
- [ ] **Scraping Santander**: `/personas/beneficios`. Anti-bot agresivo, requiere ScrapingBee + posiblemente rotación de proxies. Nivel: difícil.

### Baja Prioridad (post-MVP)

- [ ] **Autenticación de usuarios**: No hay login. Para monetización o personalización futura.
- [ ] **Historial de consultas**: No se guardan las preguntas ni respuestas del usuario.
- [ ] **Filtros explícitos en UI**: Actualmente el filtro de marca se extrae del lenguaje natural. Podría haber chips/botones explícitos.
- [ ] **Push notifications**: "Nuevo descuento en tu farmacia favorita" — requiere Firebase Cloud Messaging.
- [ ] **Más bancos y fuentes**: Naranja X, Banco Nación, Visa/Mastercard portales, etc.
- [ ] **Soporte iOS**: La app Flutter está configurada solo para Android. Extensión a iOS requiere cuenta de desarrollador Apple.
- [ ] **Dashboard de administración**: Para ver qué promos hay en Supabase, cuándo se actualizaron, estadísticas de n8n.
- [ ] **Rate limiting en API**: Sin protección actualmente. Necesario antes de tráfico público.
- [ ] **Caché de respuestas**: Preguntas repetidas podrían cachearse (Redis/Vercel KV) para reducir costo de OpenAI.

---

## 8. Base de Datos

### Conexión

- **URL del proyecto**: `https://lqvcxguezmvnfwagrftr.supabase.co`
- **Dashboard**: `https://app.supabase.com` → buscar proyecto "Descuentito" o "lqvcxguezmvnfwagrftr"

### Schema de la tabla `promos`

Rediseñada en migración `0003_redesign_comercio_banco.sql` (2026-06-06):

```sql
CREATE TABLE promos (
  id                   uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  comercio             text NOT NULL,      -- dónde comprás: "Farmacity", "Despegar", etc.
  banco_billetera      text NOT NULL,      -- con qué pagás: "Mercado Pago", "Galicia", etc.
  descuento_porcentaje int,                -- 20 (para 20%)
  tope_reintegro       numeric,            -- tope en pesos del reintegro (antes: tope)
  condiciones          text,               -- texto libre de condiciones
  fecha_desde          date,               -- fecha inicio vigencia
  fecha_hasta          date,               -- fecha fin vigencia
  dias_semana          text[],             -- ["lunes", "martes"] o NULL para todos
  source_url           text,               -- URL de donde se scrapeó
  content_hash         text UNIQUE,        -- hash para dedup (simpleHash)
  embedding            vector(1536),       -- vector OpenAI text-embedding-3-small
  created_at           timestamptz DEFAULT now()
);
```

**Nota**: Los campos `marca` y `banco` fueron eliminados. Ahora son `comercio` y `banco_billetera`.

### Índice vectorial

```sql
CREATE INDEX ON promos USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

### RPC match_promos (actualizada — 2026-06-06)

```sql
CREATE OR REPLACE FUNCTION match_promos(
  query_embedding  vector(1536),
  match_count      int,
  filtro_banco     text DEFAULT NULL,
  filtro_comercio  text DEFAULT NULL
)
RETURNS TABLE (
  id uuid, comercio text, banco_billetera text, descuento_porcentaje int,
  condiciones text, fecha_desde date, fecha_hasta date,
  dias_semana text[], source_url text, similarity float
)
LANGUAGE sql STABLE AS $$
  SELECT id, comercio, banco_billetera, descuento_porcentaje, condiciones,
         fecha_desde, fecha_hasta, dias_semana, source_url,
         1 - (embedding <=> query_embedding) AS similarity
  FROM promos
  WHERE (fecha_hasta IS NULL OR fecha_hasta >= current_date)
    AND (filtro_banco IS NULL OR lower(banco_billetera) LIKE lower('%' || filtro_banco || '%'))
    AND (filtro_comercio IS NULL OR lower(comercio) LIKE lower('%' || filtro_comercio || '%'))
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
```

### RPC promos_by_banco (nueva — 2026-06-06)

```sql
CREATE OR REPLACE FUNCTION promos_by_banco(filtro_banco text)
RETURNS TABLE (
  id uuid, comercio text, banco_billetera text, descuento_porcentaje int,
  condiciones text, fecha_desde date, fecha_hasta date, dias_semana text[], source_url text
)
LANGUAGE sql STABLE AS $$
  SELECT id, comercio, banco_billetera, descuento_porcentaje, condiciones,
         fecha_desde, fecha_hasta, dias_semana, source_url
  FROM promos
  WHERE lower(banco_billetera) LIKE lower('%' || filtro_banco || '%')
    AND (fecha_hasta IS NULL OR fecha_hasta >= current_date)
  ORDER BY comercio;
$$;
```

### Permisos Supabase

Los permisos de `service_role` sobre la tabla `promos` ya están configurados:
```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON promos TO service_role;
```

### Migraciones

- `supabase/migrations/0001_init.sql` — creación de tabla, índice HNSW, RPC
- `supabase/migrations/0002_cleanup_cron.sql` — limpieza de crons de prueba
- `supabase/migrations/0003_redesign_comercio_banco.sql` — rediseño: `marca`→`comercio`, `banco`→`banco_billetera`, nuevos filtros, nueva RPC promos_by_banco

Para aplicar migraciones manualmente desde Supabase dashboard: SQL Editor → pegar contenido.

---

## 9. APIs e Integraciones

### OpenAI

- **API Key**: en `.env.local` como `OPENAI_API_KEY`
- **Modelos usados**:
  - `text-embedding-3-small`: genera vectores de 1536 dimensiones. Costo: ~$0.02/1M tokens.
  - `gpt-4o-mini`: respuestas al usuario y extracción de promos en n8n. Costo: ~$0.15/$0.60 input/output por 1M tokens.
- **Endpoints usados**:
  - `POST https://api.openai.com/v1/embeddings`
  - `POST https://api.openai.com/v1/chat/completions`

### Supabase

- **URL**: `https://lqvcxguezmvnfwagrftr.supabase.co`
- **Keys en uso**:
  - `SUPABASE_SERVICE_ROLE_KEY` — para operaciones server-side (Next.js API, n8n, seed script). SECRETO, nunca al cliente.
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — clave pública, para uso desde el browser si fuera necesario.
- **REST API de Supabase** (usado por n8n):
  - `POST /rest/v1/promos` con `Prefer: resolution=merge-duplicates` para upsert por content_hash

### n8n (self-hosted)

- **URL**: `https://clig01-n8n.1qvpfa.easypanel.host`
- **Workflow**: `n8n/descuentito-ingest-workflow.json`
- **Credenciales configuradas en n8n**:
  - Header Auth con `Authorization: Bearer {OPENAI_API_KEY}` para los nodos OpenAI
  - Headers manuales en nodo Supabase: `apikey` y `Authorization: Bearer {SERVICE_ROLE_KEY}`
- **Nota**: Los nodos nativos de OpenAI de n8n estaban rotos en la versión instalada. Se usan nodos HTTP Request genéricos en su lugar.

---

## 10. Variables de Entorno

Archivo: `.env.local` (en la raíz del proyecto Next.js)

```bash
# OpenAI
OPENAI_API_KEY=sk-proj-...              # Requerido para RAG real

# Supabase (server-side)
SUPABASE_URL=https://lqvcxguezmvnfwagrftr.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...        # Clave secreta, NUNCA al cliente

# Supabase (client-side, opcionales)
NEXT_PUBLIC_SUPABASE_URL=https://lqvcxguezmvnfwagrftr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...    # Clave pública (publishable)
```

Ver `.env.local.example` para template vacío.

**IMPORTANTE**:
- `.env.local` está en `.gitignore`. NUNCA commitear claves reales.
- Sin `OPENAI_API_KEY` o `SUPABASE_*`, el app cae automáticamente al mock fallback (funciona igual, con datos inventados).

**Para Vercel (al deployar)**:
- Agregar todas las variables en: Vercel Dashboard → Project → Settings → Environment Variables
- `SUPABASE_SERVICE_ROLE_KEY` y `OPENAI_API_KEY` solo en entorno "Production" y "Preview", nunca expuestas.

---

## 11. Decisiones Técnicas Importantes

### 1. LLM-based extraction (n8n) en lugar de CSS selectors
**Decisión**: Usar GPT-4o-mini para extraer promos del HTML en vez de parsear con selectores CSS.
**Razón**: Los sitios de bancos cambian su diseño frecuentemente. Un LLM es resiliente a cambios de layout mientras el contenido siga siendo el mismo. El costo marginal es bajo (~$0.001 por página scrapeada).
**Tradeoff**: Más lento y costoso que scraping directo. Para el volumen proyectado (5 fuentes/día) es completamente viable.

### 2. HTTP Request nodes en n8n (no native OpenAI nodes)
**Decisión**: Usar nodos genéricos HTTP Request en n8n en lugar de los nodos nativos de OpenAI.
**Razón**: Los nodos nativos de OpenAI estaban rotos/incompatibles en la versión de n8n instalada en Hostinger.
**Consecuencia**: Hay que manejar manualmente la serialización del JSON body y los headers de autenticación.

### 3. Mock → Real RAG fallback automático
**Decisión**: Si faltan las API keys o falla Supabase, el app usa datos mock en lugar de romper.
**Razón**: Permite desarrollar/demostrar el app sin configurar servicios externos. Útil para demos rápidas.
**Implementación**: En `app/api/ask/route.ts`, si `process.env.OPENAI_API_KEY` está ausente o la consulta a Supabase falla, se activa `getMockPromos()` de `lib/mock-promos.ts`.

### 4. Protocolo meta:{json} para streaming
**Decisión**: Primera línea del stream es un JSON estructurado con los datos de promos, el resto es texto libre.
**Razón**: Permite que Flutter (o cualquier cliente) tenga datos estructurados para renderizar cards, sin romper la experiencia de streaming de texto.
**Alternativa considerada y descartada**: Dos requests separados (uno para promos, otro para el texto). Más complejo y más lento.

### 5. Supabase pgvector + HNSW
**Decisión**: pgvector con índice HNSW para búsqueda vectorial.
**Razón**: Supabase lo soporta nativamente, HNSW es el estado del arte para ANN (Approximate Nearest Neighbor), no requiere infraestructura adicional (Pinecone, Weaviate, etc.).
**Configuración**: m=16, ef_construction=64 (buena calidad, suficiente para <100K promos).

### 6. No usar crypto en n8n Function nodes
**Decisión**: Implementar `simpleHash()` con aritmética entera en lugar de `require('crypto')`.
**Razón**: Node.js `require('crypto')` no está disponible en el sandbox de n8n Function nodes.
**Implementación**:
```javascript
function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  }
  return Math.abs(h).toString(16).padStart(8, '0');
}
```
Este hash se usa como `content_hash` para deduplicación en Supabase.

---

## 12. Problemas Conocidos

### RESUELTO: n8n pipeline end-to-end con Mercado Pago
- El bug de caracteres especiales fue resuelto. El pipeline funciona end-to-end.
- 12 promos reales de MP cargadas en Supabase.
- `banco_billetera = "Mercado Pago"` inyectado fijo desde el nodo "Config Fuente".

### VULNERABILIDAD: Next.js 14.2.x
- **Descripción**: La versión actual tiene una vulnerabilidad de seguridad conocida.
- **Fix**: Actualizar a la versión parcheada más reciente de la línea 14.2.x.
- **Comando**: `npm install next@latest` (verificar que sea dentro de la línea 14 si hay breaking changes en 15).

### Flutter corregido pero sin testear en emulador
- **Descripción**: El código Flutter fue corregido (fromJson: descuento_pct number→string, dias como List, key tope→tope_reintegro; botón X para volver al estado inicial con _heroController.reverse()). `flutter analyze` pasa.
- **Riesgos pendientes**: Comportamiento real en emulador/dispositivo no verificado. Permisos de red Android, parsing de stream en plataforma real.
- **Fix**: Ejecutar `flutter pub get && flutter run` en emulador.

### URL hardcodeada en Flutter
- **Archivo**: `flutter/lib/config/api_config.dart`
- **Valor actual**: `http://10.0.2.2:3000` (emulador Android → localhost)
- **Para dispositivo físico**: Usar IP local obtenida con `ipconfig` en Windows (buscar "IPv4 Address" de la interfaz WiFi).
- **Para producción**: Reemplazar con URL de Vercel después del deploy.

### Web app no testeada con datos reales
- **Descripción**: El pipeline n8n funciona y hay 12 promos reales de MP en Supabase, pero no se verificó que la web app responda correctamente usando esos datos.
- **Test a hacer**: Preguntar "¿Qué descuentos hay en Farmacity?" o "Descuentos de Mercado Pago" y verificar que devuelve datos reales coherentes.

### Referencia frágil en n8n Armar fila final
- **Descripción**: El nodo "Armar fila final" referencia al nodo anterior por su nombre exacto en el código. Si se renombra "Normalizar + content_hash (Function)", el workflow se rompe.
- **Fix preventivo**: No renombrar ese nodo en n8n. Si se renombra, actualizar la referencia en el código del nodo "Armar fila final".

---

## 13. Deuda Técnica

### Alta prioridad

1. **Seguridad Next.js**: Actualizar next@14.2.5 a versión parcheada.
2. **Validación de inputs**: El endpoint /api/ask no valida ni sanitiza la pregunta del usuario. Podría recibir payloads maliciosos o muy grandes.
3. **Rate limiting**: Sin límites de requests en /api/ask. En producción, cualquiera puede agotar el crédito de OpenAI con requests masivos.

### Media prioridad

4. **Manejo de errores**: El catch en route.ts es básico. Los errores de Supabase/OpenAI deberían loguearse y retornar mensajes apropiados al cliente.
5. **Tipado TypeScript**: Algunas partes del código usan `any`. Mejorar tipado en la respuesta de Supabase y en el parseo de promos.
6. **Tests**: No hay ningún test unitario ni de integración en ninguna parte del proyecto.
7. **Configuración Flutter para release**: El archivo `flutter/lib/config/api_config.dart` no usa variables de entorno ni flavors. Para release necesita configuración adecuada.

### Baja prioridad

8. **Edge Function vs API Route**: Hay una implementación de referencia en `supabase/functions/ask/index.ts` que nunca se usó. Considerar si migrar a Edge Function para mejor latencia global (no prioritario para Argentina).
9. **Logging y monitoring**: Sin Sentry, Datadog, ni ningún sistema de monitoreo. En producción, ciego ante errores.
10. **Rotación de claves**: Las claves de OpenAI y Supabase están hardcodeadas en .env.local y en n8n. Considerar un gestor de secretos para producción.

---

## 14. Testing

### Estado actual: SIN TESTS

No existe ningún test escrito. Esta es deuda técnica importante para antes del lanzamiento.

### Cómo probar manualmente (lo que funciona hoy)

**Web app:**
1. `npm run dev` en la raíz del proyecto
2. Abrir `http://localhost:3000`
3. Consultas que deben funcionar con mock:
   - "¿Qué descuentos hay en Farmacity?"
   - "Descuentos en supermercados con Galicia"
   - "Promos de Mercado Pago en farmacias"
4. Para probar RAG real: configurar `.env.local` con claves reales y reiniciar

**Seed script:**
```bash
node scripts/seed.mjs
# Debe completar sin errores y mostrar "Seeded X promos"
```

**Flutter (pendiente primera ejecución):**
```bash
cd flutter
flutter pub get       # instalar dependencias
flutter run           # iniciar en emulador Android
# Verificar: UI carga, se puede tipear, respuesta aparece
```

### Tests a escribir (recomendados)

- [ ] Test unitario para `getMockPromos()` en `lib/mock-promos.ts`
- [ ] Test del protocolo de parseo de stream en Flutter (`ask_service.dart`)
- [ ] Test de integración del endpoint `/api/ask` (mock de OpenAI y Supabase)
- [ ] Test del nodo "Normalizar + content_hash" en n8n (copiar función a script Node.js y testear)

---

## 15. Deployment

### Estado actual: NO DESPLEGADO

Todo corre localmente en la máquina de desarrollo.

### Deploy del web app a Vercel (instrucciones)

1. Instalar Vercel CLI si no está: `npm i -g vercel`
2. Desde la raíz del proyecto: `vercel`
3. Seguir el asistente: linkar al equipo, nombre del proyecto "descuentito"
4. En Vercel Dashboard → Project → Settings → Environment Variables, agregar:
   - `OPENAI_API_KEY` = (valor real)
   - `SUPABASE_URL` = `https://lqvcxguezmvnfwagrftr.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` = (valor real)
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://lqvcxguezmvnfwagrftr.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (valor real)
5. Redeploy: `vercel --prod`
6. Anotar la URL de producción (ej: `https://descuentito.vercel.app`)

### Actualizar Flutter con URL de producción

Después del deploy a Vercel:
```dart
// flutter/lib/config/api_config.dart
const String apiBaseUrl = 'https://descuentito.vercel.app';  // reemplazar esta línea
```

### n8n (ya desplegado)

- Ya corriendo en Hostinger EasyPanel: `https://clig01-n8n.1qvpfa.easypanel.host`
- El workflow está importado. Solo falta resolver el bug de caracteres especiales para que funcione end-to-end.

### Flutter (distribución)

Para build de release Android:
```bash
cd flutter
flutter build apk --release
# APK en: flutter/build/app/outputs/flutter-apk/app-release.apk
```
Para Play Store necesitaría cuenta de desarrollador Google ($25 one-time) y firma del APK.

---

## 16. Roadmap

### Próximas 2 horas (quick wins)

1. Testear web app con datos reales — correr `npm run dev` y hacer consultas sobre Farmacity/Mercado Pago
2. Correr Flutter por primera vez (`flutter pub get && flutter run`) y verificar que compila
3. Parchear Next.js (`npm install next@latest` dentro de línea 14)

### Próximo día (MVP con más fuentes)

1. Clonar workflow n8n a BBVA (cambiar URL + banco_billetera en "Config Fuente")
2. Clonar workflow n8n a Banco Galicia
3. Verificar que promos de múltiples bancos conviven bien en Supabase

### Próxima semana (MVP deployable)

1. Deploy Next.js a Vercel
2. Actualizar URL en Flutter, hacer build de APK
3. Agregar Galicia como segunda fuente en n8n (sitemap approach)
4. Agregar MODO como tercera fuente
5. Agregar rate limiting básico al endpoint /api/ask
6. Validar inputs en /api/ask

### Antes del lanzamiento público

1. Todas las fuentes de datos (MP, Galicia, MODO, BBVA, Santander)
2. Datos reales verificados manualmente
3. Rate limiting y autenticación básica
4. Monitoreo de errores (Sentry)
5. Tests al menos en la ruta crítica (ask endpoint)
6. Review de seguridad (claves, validaciones)
7. Build de release Flutter firmado
8. Landing page o entry point web pública

---

## 17. Instrucciones para la Próxima Sesión

### Setup inicial (si es una máquina nueva)

```bash
# 1. Clonar/abrir el proyecto
cd "C:\Users\Gonza\Documents\Vieja\Todo\PRODUCCION\Proyecto Descuentito"

# 2. Instalar dependencias web
npm install

# 3. Crear .env.local con las claves reales
# Copiar .env.local.example a .env.local y completar los valores

# 4. Iniciar web app
npm run dev
# Verificar en http://localhost:3000
```

### Para clonar workflow n8n a otro banco

1. Abrir n8n: `https://clig01-n8n.1qvpfa.easypanel.host`
2. Abrir el workflow "Descuentito Ingest - Mercado Pago" → exportar JSON
3. Importar como nuevo workflow con nombre del banco destino (ej: "Descuentito Ingest - BBVA")
4. Cambiar la URL en el nodo "HTTP Request" fuente
5. Cambiar el valor de `banco_billetera` en el nodo **"Config Fuente"**
6. Ejecutar manualmente y verificar que llegan promos a Supabase

### Para testear Flutter

```bash
# Asegurarse de tener Flutter SDK instalado y en PATH
flutter doctor   # verifica instalación

# En el proyecto
cd "C:\Users\Gonza\Documents\Vieja\Todo\PRODUCCION\Proyecto Descuentito\flutter"
flutter pub get
flutter run      # necesita emulador Android corriendo o dispositivo conectado

# Para abrir emulador: Android Studio → Device Manager → Play
```

### Para seedear Supabase con datos reales

```bash
# Desde la raíz del proyecto (con .env.local configurado)
node scripts/seed.mjs
```

### Para deployar a Vercel

```bash
# Instalar CLI
npm i -g vercel

# Desde raíz del proyecto
vercel            # primera vez: asistente de setup
vercel --prod     # deploys subsiguientes
```

---

## 18. Prompt de Continuidad

Usar este prompt al inicio de una nueva sesión de Claude Code para retomar el proyecto con todo el contexto:

---

**PROMPT:**

```
Soy Gonzalo, retomando el proyecto "Descuentito". Lee el archivo HANDOFF.md en C:\Users\Gonza\Documents\Vieja\Todo\PRODUCCION\Proyecto Descuentito\HANDOFF.md para tener todo el contexto del proyecto antes de hacer cualquier cosa.

Resumen rápido: es una app móvil Android (Flutter) + backend Next.js + Supabase pgvector + OpenAI para consultas en lenguaje natural sobre descuentos bancarios en Argentina. También tiene un workflow n8n para ingesta de datos.

Estado actual al momento del último handoff (2026-06-06):
- Web app: funciona localmente en localhost:3000; schema rediseñado (comercio/banco_billetera)
- Flutter: código corregido (fromJson, botón X, flutter analyze pasa) pero nunca ejecutado en emulador
- n8n: pipeline end-to-end funciona con Mercado Pago; nodo "Config Fuente" inyecta banco_billetera fijo
- Datos Supabase: 12 promos REALES de Mercado Pago; RPC promos_by_banco disponible
- Deploy: nada en producción

Lo que necesito hacer en esta sesión: [COMPLETAR AQUÍ con tu objetivo]

Por favor lee el HANDOFF.md completo antes de sugerir cualquier acción.
```

---

*Fin del documento de handoff. Última actualización: 2026-06-06.*
