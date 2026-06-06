/**
 * seed.mjs — Carga las promos demo en Supabase con embeddings reales de OpenAI.
 * Uso: node scripts/seed.mjs
 * Lee OPENAI_API_KEY, SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY del entorno.
 */

import { createHash } from "crypto";
import { config } from "dotenv";

config({ path: ".env.local" });

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, "");
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!OPENAI_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Faltan variables de entorno. Verificá .env.local");
  process.exit(1);
}

// Promos de demo con vigencia extendida para testing
const PROMOS = [
  {
    comercio: "Farmacity",
    banco_billetera: "Banco Galicia",
    rubro: "Farmacia",
    titulo: "20% con Banco Galicia los jueves",
    descripcion: "Presentando la tarjeta Galicia Mastercard o Visa obtenés 20% de descuento en toda la tienda.",
    descuento_pct: 20,
    medio_pago: "Banco Galicia",
    dias: ["jueves"],
    tope: "$6.000",
    fecha_hasta: "2026-12-31",
  },
  {
    comercio: "Farmacity",
    banco_billetera: "MODO",
    rubro: "Farmacia",
    titulo: "15% con MODO todos los días",
    descripcion: "Pagando con MODO obtenés 15% de descuento todos los días del mes.",
    descuento_pct: 15,
    medio_pago: "MODO",
    dias: ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"],
    tope: "$4.000",
    fecha_hasta: "2026-12-31",
  },
  {
    comercio: "YPF",
    banco_billetera: "MODO",
    rubro: "Combustible",
    titulo: "15% cargando nafta con MODO los lunes",
    descripcion: "Reintegramos 15% al cargar combustible en cualquier estación YPF pagando con MODO.",
    descuento_pct: 15,
    medio_pago: "MODO",
    dias: ["lunes"],
    tope: "$3.500",
    fecha_hasta: "2026-12-31",
  },
  {
    comercio: "YPF",
    banco_billetera: "Banco Santander",
    rubro: "Combustible",
    titulo: "10% con Santander los miércoles",
    descripcion: "Descuento del 10% cargando nafta o gasoil en YPF con tarjetas Santander.",
    descuento_pct: 10,
    medio_pago: "Banco Santander",
    dias: ["miércoles"],
    tope: "$2.500",
    fecha_hasta: "2026-12-31",
  },
  {
    comercio: "Axion",
    banco_billetera: "Cuenta DNI",
    rubro: "Combustible",
    titulo: "20% con Cuenta DNI los martes",
    descripcion: "Cargá combustible en Axion y pagá con Cuenta DNI (Banco Provincia) para obtener 20% de reintegro.",
    descuento_pct: 20,
    medio_pago: "Cuenta DNI",
    dias: ["martes"],
    tope: "$3.000",
    fecha_hasta: "2026-12-31",
  },
  {
    comercio: "Shell",
    banco_billetera: "BBVA",
    rubro: "Combustible",
    titulo: "12% con BBVA los jueves",
    descripcion: "12% de descuento al cargar combustible en Shell pagando con tarjetas BBVA.",
    descuento_pct: 12,
    medio_pago: "BBVA",
    dias: ["jueves"],
    tope: "$2.800",
    fecha_hasta: "2026-12-31",
  },
  {
    comercio: "Starbucks",
    banco_billetera: "Club La Nación",
    rubro: "Café",
    titulo: "2x1 con Club La Nación los miércoles",
    descripcion: "Presentando el beneficio Club La Nación llevás 2 bebidas al precio de 1 todos los miércoles.",
    descuento_pct: 50,
    medio_pago: "Club La Nación",
    dias: ["miércoles"],
    tope: null,
    fecha_hasta: "2026-12-31",
  },
  {
    comercio: "Starbucks",
    banco_billetera: "Banco Galicia",
    rubro: "Café",
    titulo: "25% con Galicia Eminent los fines de semana",
    descripcion: "Titulares de Galicia Eminent obtienen 25% en cualquier compra en Starbucks los sábados y domingos.",
    descuento_pct: 25,
    medio_pago: "Banco Galicia Eminent",
    dias: ["sábado", "domingo"],
    tope: "$5.000",
    fecha_hasta: "2026-12-31",
  },
  {
    comercio: "Tea Connection",
    banco_billetera: "Mercado Pago",
    rubro: "Café / Restaurante",
    titulo: "20% con Mercado Pago los martes y miércoles",
    descripcion: "Pagá con Mercado Pago y obtenés 20% de descuento en el total de tu consumición.",
    descuento_pct: 20,
    medio_pago: "Mercado Pago",
    dias: ["martes", "miércoles"],
    tope: "$4.500",
    fecha_hasta: "2026-12-31",
  },
  {
    comercio: "Nike",
    banco_billetera: "BBVA",
    rubro: "Indumentaria",
    titulo: "30% con BBVA los viernes",
    descripcion: "Comprando en tiendas Nike con tarjetas BBVA obtenés 30% de descuento los días viernes.",
    descuento_pct: 30,
    medio_pago: "BBVA",
    dias: ["viernes"],
    tope: "$15.000",
    fecha_hasta: "2026-12-31",
  },
  {
    comercio: "Adidas",
    banco_billetera: "Banco Santander",
    rubro: "Indumentaria",
    titulo: "25% con Santander los jueves y viernes",
    descripcion: "Santander Select y Santander American Express: 25% en tiendas Adidas oficiales.",
    descuento_pct: 25,
    medio_pago: "Banco Santander",
    dias: ["jueves", "viernes"],
    tope: "$12.000",
    fecha_hasta: "2026-12-31",
  },
  {
    comercio: "Dexter",
    banco_billetera: "MODO",
    rubro: "Indumentaria / Calzado",
    titulo: "20% con MODO los lunes",
    descripcion: "Pagando con cualquier banco a través de MODO obtenés 20% de descuento en toda la tienda Dexter.",
    descuento_pct: 20,
    medio_pago: "MODO",
    dias: ["lunes"],
    tope: "$8.000",
    fecha_hasta: "2026-12-31",
  },
];

function buildContent(p) {
  const dias = p.dias.join(", ");
  const tope = p.tope ? `. Tope de reintegro: ${p.tope}` : "";
  return `${p.comercio} (${p.rubro}): ${p.descuento_pct}% de descuento pagando con ${p.banco_billetera} (${p.medio_pago}) los días ${dias}. ${p.titulo}. ${p.descripcion}${tope}. Vigente hasta ${p.fecha_hasta}.`;
}

function buildHash(p) {
  const raw = `${p.comercio}|${p.banco_billetera}|${p.titulo}|${p.fecha_hasta}`;
  return createHash("sha256").update(raw).digest("hex");
}

async function embedText(text) {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify({ model: "text-embedding-3-small", input: text }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI embeddings error ${res.status}: ${err}`);
  }
  const json = await res.json();
  return json.data[0].embedding;
}

async function upsertPromo(row) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/promos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase upsert error ${res.status}: ${err}`);
  }
}

async function main() {
  console.log(`\nDescuentito — Seed con embeddings reales`);
  console.log(`Supabase: ${SUPABASE_URL}`);
  console.log(`Promos a cargar: ${PROMOS.length}\n`);

  let ok = 0;
  let fail = 0;

  for (const promo of PROMOS) {
    try {
      process.stdout.write(`  ${promo.comercio} — ${promo.titulo}... `);
      const content = buildContent(promo);
      const embedding = await embedText(content);
      const content_hash = buildHash(promo);

      await upsertPromo({
        comercio: promo.comercio,
        banco_billetera: promo.banco_billetera,
        rubro: promo.rubro,
        titulo: promo.titulo,
        descripcion: promo.descripcion,
        descuento_pct: promo.descuento_pct,
        medio_pago: promo.medio_pago,
        dias: promo.dias,
        tope_reintegro: promo.tope ?? null,
        fecha_desde: null,
        fecha_hasta: promo.fecha_hasta,
        fuente_url: null,
        content,
        embedding,
        content_hash,
      });

      console.log("✓");
      ok++;
    } catch (err) {
      console.log(`✗ ERROR: ${err.message}`);
      fail++;
    }

    // Pequeña pausa para no saturar la API de OpenAI
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log(`\nListo: ${ok} OK, ${fail} errores.`);
  if (ok > 0) {
    console.log(`\nLa app ya usa RAG real. Reiniciá el servidor con npm run dev.`);
  }
}

main().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});
