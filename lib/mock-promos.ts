// ============================================================================
// SAMPLE / DEMO DATA — NOT scraped, NOT verified, NOT real-time.
// These promos are hand-written examples used so the app runs with zero config
// (no API keys). In production, this is replaced by the Supabase RAG pipeline.
// Do NOT present these as authoritative discounts to end users.
// ============================================================================

export interface Promo {
  comercio: string;
  banco_billetera: string;
  rubro: string;
  titulo: string;
  descripcion: string;
  descuento_pct: number;
  medio_pago: string;
  dias: string[];
  tope: string;
  fecha_hasta: string;
}

export const MOCK_PROMOS: Promo[] = [
  {
    comercio: "Farmacity",
    banco_billetera: "Banco Galicia",
    rubro: "Farmacia",
    titulo: "20% los jueves con Banco Galicia",
    descripcion:
      "20% de descuento en toda la compra pagando con tarjetas de crédito Banco Galicia.",
    descuento_pct: 20,
    medio_pago: "Banco Galicia (crédito)",
    dias: ["Jueves"],
    tope: "$6.000",
    fecha_hasta: "2026-12-31",
  },
  {
    comercio: "Farmacity",
    banco_billetera: "MODO",
    rubro: "Farmacia",
    titulo: "15% con MODO todos los días",
    descripcion:
      "15% de reintegro pagando con MODO desde cualquier banco adherido.",
    descuento_pct: 15,
    medio_pago: "MODO",
    dias: ["Todos los días"],
    tope: "$4.000",
    fecha_hasta: "2026-09-30",
  },
  {
    comercio: "YPF",
    banco_billetera: "MODO",
    rubro: "Combustible",
    titulo: "15% cargando con MODO los lunes",
    descripcion:
      "15% de descuento en combustible Infinia y Súper pagando con MODO en estaciones YPF.",
    descuento_pct: 15,
    medio_pago: "MODO",
    dias: ["Lunes"],
    tope: "$8.000",
    fecha_hasta: "2026-10-31",
  },
  {
    comercio: "YPF",
    banco_billetera: "Banco Nación",
    rubro: "Combustible",
    titulo: "10% con App YPF y Banco Nación",
    descripcion:
      "10% de reintegro cargando combustible desde la App YPF con tarjetas Banco Nación.",
    descuento_pct: 10,
    medio_pago: "Banco Nación + App YPF",
    dias: ["Miércoles", "Sábado"],
    tope: "$5.000",
    fecha_hasta: "2026-08-31",
  },
  {
    comercio: "Axion",
    banco_billetera: "Banco Santander",
    rubro: "Combustible",
    titulo: "20% con Banco Santander los martes",
    descripcion:
      "20% de descuento en combustible pagando con tarjetas Santander en estaciones Axion.",
    descuento_pct: 20,
    medio_pago: "Banco Santander (crédito)",
    dias: ["Martes"],
    tope: "$7.000",
    fecha_hasta: "2026-11-30",
  },
  {
    comercio: "Shell",
    banco_billetera: "BBVA",
    rubro: "Combustible",
    titulo: "12% con Shell Box y BBVA",
    descripcion:
      "12% de reintegro pagando con la app Shell Box vinculada a tarjetas BBVA.",
    descuento_pct: 12,
    medio_pago: "BBVA + Shell Box",
    dias: ["Viernes", "Domingo"],
    tope: "$6.000",
    fecha_hasta: "2026-09-15",
  },
  {
    comercio: "Starbucks",
    banco_billetera: "Club La Nación",
    rubro: "Cafetería",
    titulo: "2x1 con Club La Nación los miércoles",
    descripcion:
      "Llevá 2 bebidas pagando 1 presentando tu credencial Club La Nación.",
    descuento_pct: 50,
    medio_pago: "Club La Nación",
    dias: ["Miércoles"],
    tope: "Sin tope (1 uso)",
    fecha_hasta: "2026-12-31",
  },
  {
    comercio: "Starbucks",
    banco_billetera: "Banco Galicia",
    rubro: "Cafetería",
    titulo: "25% con Banco Galicia los fines de semana",
    descripcion:
      "25% de descuento en bebidas y comidas pagando con Banco Galicia.",
    descuento_pct: 25,
    medio_pago: "Banco Galicia (crédito/débito)",
    dias: ["Sábado", "Domingo"],
    tope: "$3.000",
    fecha_hasta: "2026-10-31",
  },
  {
    comercio: "Tea Connection",
    banco_billetera: "Banco Macro",
    rubro: "Cafetería",
    titulo: "20% con Banco Macro los martes",
    descripcion:
      "20% de descuento en todo el menú pagando con tarjetas Banco Macro.",
    descuento_pct: 20,
    medio_pago: "Banco Macro (crédito)",
    dias: ["Martes"],
    tope: "$4.000",
    fecha_hasta: "2026-09-30",
  },
  {
    comercio: "Nike",
    banco_billetera: "Banco Ciudad",
    rubro: "Indumentaria",
    titulo: "30% y 6 cuotas con Banco Ciudad",
    descripcion:
      "30% de descuento y hasta 6 cuotas sin interés con tarjetas Banco Ciudad en Nike.",
    descuento_pct: 30,
    medio_pago: "Banco Ciudad (crédito)",
    dias: ["Jueves", "Viernes"],
    tope: "$15.000",
    fecha_hasta: "2026-08-31",
  },
  {
    comercio: "Adidas",
    banco_billetera: "Banco Provincia",
    rubro: "Indumentaria",
    titulo: "25% con Banco Provincia los miércoles",
    descripcion:
      "25% de descuento pagando con Cuenta DNI / Banco Provincia en tiendas Adidas.",
    descuento_pct: 25,
    medio_pago: "Cuenta DNI (Banco Provincia)",
    dias: ["Miércoles"],
    tope: "$10.000",
    fecha_hasta: "2026-11-30",
  },
  {
    comercio: "Dexter",
    banco_billetera: "Banco Galicia",
    rubro: "Indumentaria",
    titulo: "20% y 3 cuotas con Banco Galicia",
    descripcion:
      "20% de descuento y 3 cuotas sin interés con tarjetas Banco Galicia en Dexter.",
    descuento_pct: 20,
    medio_pago: "Banco Galicia (crédito)",
    dias: ["Sábado"],
    tope: "$12.000",
    fecha_hasta: "2026-10-15",
  },
];

// Lightweight keyword/brand matcher used by the mock (no-API) path.
export function matchPromos(question: string, limit = 6): Promo[] {
  const q = normalize(question);

  const scored = MOCK_PROMOS.map((p) => {
    let score = 0;
    const comercio = normalize(p.comercio);
    const banco = normalize(p.banco_billetera);
    const rubro = normalize(p.rubro);

    // Comercio (dónde comprás) is the strongest signal.
    if (comercio && q.includes(comercio)) score += 10;

    // Banco / billetera (con qué pagás).
    if (banco && q.includes(banco)) score += 8;

    // Rubro / synonym matching
    for (const [kw, rubros] of Object.entries(RUBRO_SYNONYMS)) {
      if (q.includes(kw) && rubros.includes(p.rubro)) score += 5;
    }
    if (q.includes(rubro)) score += 4;

    // Loose token overlap with title/description for relevance
    for (const token of q.split(/\s+/)) {
      if (token.length < 4) continue;
      if (normalize(p.titulo).includes(token)) score += 1;
      if (normalize(p.descripcion).includes(token)) score += 1;
      if (normalize(p.medio_pago).includes(token)) score += 1;
    }

    return { p, score };
  });

  const hits = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.p);

  return hits;
}

const RUBRO_SYNONYMS: Record<string, string[]> = {
  nafta: ["Combustible"],
  combustible: ["Combustible"],
  gasoil: ["Combustible"],
  cargar: ["Combustible"],
  estacion: ["Combustible"],
  cafe: ["Cafetería"],
  cafeteria: ["Cafetería"],
  bebida: ["Cafetería"],
  farmacia: ["Farmacia"],
  remedio: ["Farmacia"],
  medicamento: ["Farmacia"],
  perfumeria: ["Farmacia"],
  ropa: ["Indumentaria"],
  indumentaria: ["Indumentaria"],
  zapatilla: ["Indumentaria"],
  calzado: ["Indumentaria"],
};

function normalize(s: string): string {
  // Lowercase and strip accents (combining diacritical marks U+0300–U+036F)
  // so "café" matches "cafe", "Cafetería" matches "cafeteria", etc.
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}
