# Descuentito

Asistente de IA (chat) que te dice qué **descuentos de bancos, tarjetas y billeteras**
están vigentes hoy para marcas argentinas como Farmacity, YPF, Axion, Shell,
Starbucks, Tea Connection, Nike, Adidas y Dexter.

Interfaz tipo chat de una sola página, con un look **"Liquid Glass"** oscuro
(glassmorphism, fondo casi OLED y acento cian eléctrico).

## Correr el demo (sin configuración)

```bash
npm install
npm run dev
```

Abrí **http://localhost:3000**.

Por defecto la app usa un **dataset de demostración local** (mock), así que
**funciona sin ninguna API key**. Escribí una pregunta o tocá una de las
sugerencias, por ejemplo:

- "¿Descuentos en Farmacity hoy?"
- "¿Dónde cargo nafta más barato?"
- "Promos en Starbucks"
- "Indumentaria: Nike o Adidas"

> Los datos del mock son de ejemplo (no scrapeados ni verificados). Sirven para
> que el demo corra y se vea premium sin depender de servicios externos.

## Activar RAG real (opcional)

La app pasa **automáticamente** a usar RAG real cuando detecta las variables de
entorno necesarias. Para activarlo:

1. Copiá `.env.local.example` a `.env.local`.
2. Completá:
   - `OPENAI_API_KEY` — para embeddings (`text-embedding-3-small`) y chat (`gpt-4o-mini`).
   - `SUPABASE_URL` — URL de tu proyecto Supabase.
   - `SUPABASE_SERVICE_ROLE_KEY` (o `SUPABASE_ANON_KEY` como fallback).
3. Asegurate de tener en Supabase una función RPC `match_promos` con parámetros
   `query_embedding`, `match_count` y `filtro_marca` (opcional).
4. Reiniciá `npm run dev`.

Con las claves presentes, el endpoint `POST /api/ask`:

1. Embebe la pregunta con OpenAI.
2. Llama a `match_promos` en Supabase para recuperar las promos más relevantes.
3. Responde con `gpt-4o-mini` usando **solo** esas promos como contexto, en
   español, y aclarando si no hay info.

Si cualquier llamada real falla, **cae automáticamente al mock** para que el
demo nunca se rompa. La `OPENAI_API_KEY` se usa **solo del lado del servidor**
(en `app/api/ask/route.ts`), nunca se expone al cliente.

## Estructura

```
app/
  layout.tsx          # Layout raíz + metadata
  page.tsx            # UI del chat (client component)
  globals.css         # Design system: fondo OLED, glass, scrollbar
  api/ask/route.ts    # Backend: mock por defecto, RAG real si hay claves
components/
  Logo.tsx            # Marca cian (SVG)
lib/
  mock-promos.ts      # Dataset de demostración + matcher por keyword/marca
tailwind.config.ts    # Tokens (acento cian, glass, glows, animaciones)
```

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS v3
- Sin dependencias de SDK: las llamadas a OpenAI/Supabase usan `fetch`.

## Diseño

- Fondo negro casi OLED con radiales sutiles (violeta medianoche + azul medianoche).
- Paneles de vidrio esmerilado: `backdrop-filter: blur(15px) saturate(150%)`.
- Acento único: **cian eléctrico `#22d3ee`** (secundario raro: magenta `#e879f9`).
- Esquinas redondeadas (24px tarjetas, 16px burbujas, pills para botones).
- Glows suaves en lugar de sombras negras duras.
