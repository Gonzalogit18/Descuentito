import { NextRequest } from "next/server";
import { matchPromos, MOCK_PROMOS, type Promo } from "../../../lib/mock-promos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface AskBody {
  question?: unknown;
}

// Lightweight discovery endpoint: returns the available rubros (with counts) so
// the landing screen can show browsable category chips without running a search.
// Falls back to the mock rubros (derived from the sample promos) when there are
// no API keys configured.
export async function GET() {
  const hasSupabase =
    !!process.env.SUPABASE_URL &&
    !!(
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
    );

  if (hasSupabase) {
    try {
      const opciones = await getRubroCounts(getEnv());
      if (opciones.length > 0) {
        return Response.json({ opciones });
      }
    } catch (err) {
      console.error("[ask] GET rubro counts failed, using mock:", err);
    }
  }

  return Response.json({ opciones: mockRubroCounts() });
}

// Build rubro chips from the local sample data (no-API fallback for GET).
function mockRubroCounts(): ClarOption[] {
  const counts = new Map<string, number>();
  for (const p of MOCK_PROMOS) {
    counts.set(p.rubro, (counts.get(p.rubro) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([rubro, count]) => ({ label: rubro, value: rubro, count }))
    .sort((a, b) => b.count - a.count);
}

export async function POST(req: NextRequest) {
  let question = "";
  try {
    const body = (await req.json()) as AskBody;
    if (typeof body.question === "string") question = body.question.trim();
  } catch {
    // ignore — handled below
  }

  if (!question) {
    return Response.json(
      { error: "Falta la pregunta." },
      { status: 400 }
    );
  }

  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasSupabase =
    !!process.env.SUPABASE_URL &&
    !!(
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
    );

  // ---- Real RAG path (only when keys present). Falls back on any error. ----
  if (hasOpenAI && hasSupabase) {
    try {
      return await realRagAnswer(question);
    } catch (err) {
      console.error("[ask] RAG failed, falling back to mock:", err);
      // fall through to mock
    }
  }

  // ---- Mock path (zero-config default) ----
  return mockAnswer(question);
}

// ---------------------------------------------------------------------------
// MOCK PATH — keyword/brand match over local sample data. Streams a typing
// effect so the UX matches the real path.
// ---------------------------------------------------------------------------
function mockAnswer(question: string): Response {
  const hits = matchPromos(question);
  const text = buildMockText(question, hits);
  return streamText(text, { source: "mock", promos: hits });
}

function buildMockText(question: string, hits: Promo[]): string {
  if (hits.length === 0) {
    return (
      "No tengo registrada ninguna promoción que aplique a eso en mis datos de ejemplo. " +
      "Probá preguntando por una marca como Farmacity, YPF, Starbucks, Nike o Adidas. " +
      "\n\n_(Datos de demostración: verificá siempre las condiciones en el comercio.)_"
    );
  }

  const lines = hits.map((p) => {
    const dias = p.dias.join(", ");
    const tope = p.tope ? ` · Tope: ${p.tope}` : "";
    return `• *${p.comercio}* — ${p.descuento_pct}% con ${p.medio_pago} (${dias})${tope}. ${p.titulo}.`;
  });

  const comercios = Array.from(new Set(hits.map((h) => h.comercio)));
  const intro =
    comercios.length === 1
      ? `Estos son los descuentos que tengo para ${comercios[0]} hoy:`
      : `Encontré estos descuentos vigentes:`;

  return (
    `${intro}\n\n${lines.join("\n")}\n\n` +
    `_Recordá verificar topes y condiciones en el comercio. (Datos de demostración.)_`
  );
}

// ---------------------------------------------------------------------------
// REAL RAG PATH — intent router (gpt-4o-mini tool calling) decides whether to
// search promos, list all promos of a store/category, or ask for clarification.
// ---------------------------------------------------------------------------
async function realRagAnswer(question: string): Promise<Response> {
  const env = getEnv();

  // Fetch the available rubros once: the router needs the real list so it can
  // only map products to categories that actually exist in the DB.
  const opciones = await getRubroCounts(env);
  const rubrosDisponibles = opciones.map((o) => o.value);

  // 1) Intent routing via OpenAI tool calling (cheap: gpt-4o-mini).
  const intent = await routeIntent(question, env.openaiKey, rubrosDisponibles);

  // 2) Act on the intent.
  switch (intent.kind) {
    case "conversacional": {
      // Greetings / small talk / thanks / off-topic / genuinely-no-data.
      // Answer like a person first; optionally attach rubro chips as a soft
      // suggestion (only when it makes sense to invite browsing).
      return conversationalResponse(
        intent.mensaje,
        intent.sugerirRubros ? opciones : []
      );
    }
    case "clarification": {
      // AMPLIA / vague "show me everything": no promos retrieved. Offer rubros
      // (with counts) as chips so the user can narrow down.
      const mensaje =
        intent.mensaje ||
        "¡Tengo un montón! 😄 ¿De qué rubro te muestro? Tocá uno para arrancar.";
      return clarificationResponse(mensaje, opciones);
    }
    case "comercio": {
      const promos = await rpc(env, "promos_by_comercio", {
        filtro_comercio: intent.comercio,
      });
      return answerWithPromos(promos, { kind: "comercio", comercio: intent.comercio });
    }
    case "rubro": {
      const promos = await rpc(env, "promos_by_rubro", {
        filtro_rubro: intent.rubro,
      });
      return answerWithPromos(promos, { kind: "rubro", rubro: intent.rubro });
    }
    case "producto":
    default: {
      // PRODUCTO: the router mapped the product to a list of REAL rubros (no
      // vector search — promo texts don't mention products). Fetch all promos
      // of those rubros, merge & dedupe by id, order by descuento_pct desc.
      const rubros = intent.rubros.filter(
        (r) => rubrosDisponibles.includes(r) // defensive: only real rubros
      );

      // No relevant category exists → honest conversational answer + soft
      // suggestion to browse other categories (never a cold dead-end).
      if (rubros.length === 0) {
        return conversationalResponse(
          `Mmm, no encontré descuentos para «${intent.producto}» por ahora 😕. ` +
            `Pero tengo en un montón de otras categorías — ¿querés ver alguna?`,
          opciones
        );
      }

      const promos = await fetchPromosByRubros(env, rubros);

      // The mapped rubros existed but returned zero rows → same honest path.
      if (promos.length === 0) {
        return conversationalResponse(
          `Mmm, no encontré descuentos para «${intent.producto}» por ahora 😕. ` +
            `Probá con otra categoría 👇`,
          opciones
        );
      }

      return answerWithPromos(promos, {
        kind: "producto",
        producto: intent.producto,
      });
    }
  }
}

// Fetch all current promos across several rubros, merging and deduping by id,
// ordered by descuento_pct desc. Per-rubro looping (no extra RPC / no manual
// SQL step). promos_by_rubro already applies the date filter.
async function fetchPromosByRubros(
  env: Env,
  rubros: string[]
): Promise<unknown[]> {
  const results = await Promise.all(
    rubros.map((r) => rpc(env, "promos_by_rubro", { filtro_rubro: r }))
  );

  const byId = new Map<string, Record<string, unknown>>();
  let fallbackKey = 0;
  for (const rows of results) {
    for (const row of rows) {
      const r = (row ?? {}) as Record<string, unknown>;
      const id =
        typeof r.id === "string" && r.id ? r.id : `__noid_${fallbackKey++}`;
      if (!byId.has(id)) byId.set(id, r);
    }
  }

  return Array.from(byId.values()).sort(
    (a, b) => (Number(b.descuento_pct) || 0) - (Number(a.descuento_pct) || 0)
  );
}

// Resolve and validate required env vars once.
function getEnv() {
  return {
    openaiKey: process.env.OPENAI_API_KEY!,
    supabaseUrl: process.env.SUPABASE_URL!.replace(/\/$/, ""),
    supabaseKey:
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!,
  };
}

type Env = ReturnType<typeof getEnv>;

// ---- Intent router --------------------------------------------------------

type Intent =
  | {
      kind: "conversacional";
      mensaje: string;
      // When true, attach the rubro chips as a soft suggestion after the text.
      sugerirRubros: boolean;
    }
  | { kind: "clarification"; mensaje?: string }
  | { kind: "comercio"; comercio: string }
  | { kind: "rubro"; rubro: string }
  | { kind: "producto"; producto: string; rubros: string[]; comercio?: string };

// Ask gpt-4o-mini (tool calling) to classify the query. Falls back to a safe
// clarification-less "producto with no rubros" on any error so the route still
// responds. `rubrosDisponibles` are the REAL rubros in the DB; the model may
// only choose from these when mapping a product to categories.
async function routeIntent(
  question: string,
  openaiKey: string,
  rubrosDisponibles: string[]
): Promise<Intent> {
  const listaRubros = rubrosDisponibles.length
    ? rubrosDisponibles.join(", ")
    : "(no hay rubros disponibles)";

  const tools = [
    {
      type: "function",
      function: {
        name: "buscar_promos",
        description:
          "Buscar promociones de descuento. Usá esto cuando el usuario nombra un producto puntual, un comercio/marca concreto, o un rubro/categoría concreto. NO lo uses para pedidos vagos como 'qué hay' o 'todos los descuentos'.",
        parameters: {
          type: "object",
          properties: {
            producto: {
              type: "string",
              description:
                "El PRODUCTO puntual que nombró el usuario (ej. 'shampoo', 'ram de pc', 'verduras', 'zapatillas', 'sillón'). Completá esto cuando el usuario busca un producto concreto, NO un comercio ni un rubro entero.",
            },
            rubros: {
              type: "array",
              items: { type: "string" },
              description:
                `Cuando completes 'producto', mapealo a los rubros relevantes ELEGIDOS EXCLUSIVAMENTE de esta lista de rubros que existen en la base: [${listaRubros}]. ` +
                "Ejemplos de criterio (elegí solo los que existan en la lista): 'shampoo' -> Farmacia/Cosméticos/Perfumería; 'ram de pc' -> Tecnología/Electrónica; 'verduras' o 'leche' -> rubros de alimentos/super/bebidas; 'zapatillas' -> Indumentaria; 'sillón' -> Muebles/Hogar. " +
                "NO inventes rubros que no estén en la lista. Si ningún rubro de la lista es relevante para el producto, devolvé un array vacío.",
            },
            comercio: {
              type: "string",
              description:
                "Nombre del comercio/marca SOLO si el usuario lo nombra explícitamente (ej. 'Farmacity', 'Lacoste'). En ese caso se listan TODAS sus promos.",
            },
            rubro: {
              type: "string",
              description:
                "Nombre del rubro/categoría SOLO si el usuario pide una categoría entera (ej. 'electro', 'farmacia', 'indumentaria'). En ese caso se listan TODAS las promos del rubro.",
            },
          },
          required: [],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "pedir_aclaracion",
        description:
          "Usá esto SOLO cuando el usuario pide explícitamente VER TODO pero sin elegir nada (ej. 'qué descuentos hay', 'qué tenés', 'mostrame todo', 'qué promos hay'). Se le ofrecen rubros para que elija. NO lo uses para saludos, agradecimientos, off-topic ni para categorías que no tenemos: para eso usá responder_conversacion.",
        parameters: {
          type: "object",
          properties: {
            mensaje: {
              type: "string",
              description:
                "Mensaje breve, cálido y humano en español rioplatense invitando a elegir un rubro (ej. '¡Tengo un montón! ¿De qué rubro te muestro?').",
            },
          },
          required: [],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "responder_conversacion",
        description:
          "Usá esto para responder COMO UNA PERSONA cuando: (a) es un saludo, charla, agradecimiento o pregunta sobre vos ('hola', 'buenas', 'gracias', 'quién sos', 'cómo estás'); (b) preguntan por descuentos que NO tenemos (ej. combustible/nafta, vuelos, hoteles, o cualquier rubro/comercio que no esté en la lista de rubros disponibles); (c) es off-topic. SIEMPRE respondé primero la pregunta de forma honesta y cálida, en español rioplatense. Nunca evadas con chips a secas.",
        parameters: {
          type: "object",
          properties: {
            mensaje: {
              type: "string",
              description:
                "La respuesta conversacional, honesta y cálida, en español rioplatense. Ejemplos: saludo -> '¡Hola! 👋 Decime qué buscás: una marca (ej. Farmacity), un rubro (ej. electro) o un producto (ej. zapatillas).'; nafta -> 'No, todavía no tengo descuentos de combustible 😕. Sí tengo un montón en otras categorías — ¿querés que te muestre alguna?'; gracias -> '¡De nada! 🙌 Cualquier cosa, acá estoy.'. Podés usar 1 emoji como mucho.",
            },
            sugerir_rubros: {
              type: "boolean",
              description:
                "true si conviene ofrecer los rubros disponibles como sugerencia debajo del mensaje (típico cuando NO tenemos lo que pidió, ej. nafta/vuelos, o cuando invitás a explorar). false para saludos cortos o agradecimientos donde los chips sobran.",
            },
          },
          required: ["mensaje"],
        },
      },
    },
  ];

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        tool_choice: "required",
        tools,
        messages: [
          {
            role: "system",
            content:
              "Sos el router de intención de Descuentito (app argentina de descuentos). Clasificá el pedido del usuario y llamá a UNA herramienta. Hablá en español rioplatense, cálido y humano.\n\n" +
              "Rubros que existen en la base: [" +
              listaRubros +
              "].\n\n" +
              "Elegí así:\n" +
              "• responder_conversacion → saludos, charla, agradecimientos, preguntas sobre vos, off-topic; O descuentos que NO tenemos (un rubro/comercio/producto que no entra en la lista de rubros de arriba, ej. combustible/nafta, vuelos, hoteles). Respondé honesto primero.\n" +
              "• pedir_aclaracion → SOLO pedidos de 'mostrame todo' sin elegir nada ('qué hay', 'qué descuentos tenés', 'mostrame todo').\n" +
              "• buscar_promos con 'comercio' → nombra una marca/comercio concreto (ej. 'Farmacity', 'Nike').\n" +
              "• buscar_promos con 'rubro' → pide una categoría entera que SÍ existe en la lista (ej. 'electro', 'farmacia', 'indumentaria').\n" +
              "• buscar_promos con 'producto' + 'rubros' → nombra un producto puntual; mapealo a los rubros relevantes ELEGIDOS EXCLUSIVAMENTE de la lista de arriba. Nunca inventes un rubro fuera de la lista. Si ningún rubro de la lista aplica al producto (ej. 'nafta'), NO uses buscar_promos: usá responder_conversacion.",
          },
          { role: "user", content: question },
        ],
      }),
    });
    if (!res.ok) throw new Error(`router ${res.status}`);
    const json = (await res.json()) as {
      choices?: {
        message?: {
          tool_calls?: { function?: { name?: string; arguments?: string } }[];
        };
      }[];
    };
    const call = json.choices?.[0]?.message?.tool_calls?.[0]?.function;
    if (!call?.name) return safeProducto(question);
    let args: Record<string, unknown> = {};
    try {
      args = call.arguments ? JSON.parse(call.arguments) : {};
    } catch {
      args = {};
    }

    if (call.name === "responder_conversacion") {
      const mensaje =
        typeof args.mensaje === "string" && args.mensaje.trim()
          ? args.mensaje.trim()
          : "¡Hola! 👋 Decime qué buscás: una marca (ej. Farmacity), un rubro (ej. electro) o un producto (ej. zapatillas).";
      return {
        kind: "conversacional",
        mensaje,
        sugerirRubros: args.sugerir_rubros === true,
      };
    }

    if (call.name === "pedir_aclaracion") {
      return {
        kind: "clarification",
        mensaje: typeof args.mensaje === "string" ? args.mensaje : undefined,
      };
    }
    // buscar_promos: comercio takes priority, then rubro, then producto.
    const comercio =
      typeof args.comercio === "string" && args.comercio.trim()
        ? args.comercio.trim()
        : undefined;
    const rubro =
      typeof args.rubro === "string" && args.rubro.trim()
        ? args.rubro.trim()
        : undefined;
    const producto =
      typeof args.producto === "string" && args.producto.trim()
        ? args.producto.trim()
        : undefined;
    const rubros = Array.isArray(args.rubros)
      ? Array.from(
          new Set(
            args.rubros
              .map((r) => (typeof r === "string" ? r.trim() : ""))
              .filter(Boolean)
          )
        )
      : [];

    if (comercio && !producto && !rubro) return { kind: "comercio", comercio };
    if (rubro && !producto) return { kind: "rubro", rubro };
    return {
      kind: "producto",
      producto: producto || question,
      rubros,
      comercio,
    };
  } catch (e) {
    console.error("[ask] intent router failed, defaulting to producto:", e);
    return safeProducto(question);
  }
}

// Fallback intent when the router errors: a producto with no mapped rubros.
// The PRODUCTO handler will then return a friendly "no encontré" message rather
// than the old noisy vector search.
function safeProducto(question: string): Intent {
  return { kind: "producto", producto: question, rubros: [] };
}

// ---- Retrieval helpers ----------------------------------------------------

// Generic Supabase RPC call returning the rows array.
async function rpc(
  env: Env,
  fn: string,
  body: Record<string, unknown>
): Promise<unknown[]> {
  const res = await fetch(`${env.supabaseUrl}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: env.supabaseKey,
      Authorization: `Bearer ${env.supabaseKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${fn} ${res.status}`);
  const rows = await res.json();
  return Array.isArray(rows) ? rows : [];
}

// Available rubros with counts, for the clarification chips.
async function getRubroCounts(env: Env): Promise<ClarOption[]> {
  try {
    const rows = await rpc(env, "promos_rubro_counts", {});
    return rows
      .map((r) => {
        const o = (r ?? {}) as Record<string, unknown>;
        const rubro = typeof o.rubro === "string" ? o.rubro : String(o.rubro ?? "");
        const total = Number(o.total) || 0;
        return rubro
          ? { label: rubro, value: rubro, count: total }
          : null;
      })
      .filter((x): x is ClarOption => x !== null);
  } catch (e) {
    console.error("[ask] rubro counts failed:", e);
    return [];
  }
}

interface ClarOption {
  label: string;
  value: string;
  count: number;
}

// ---- Response builders ----------------------------------------------------

// Stream a clarification payload: a meta line (type=clarification) + a short
// message as the answer text, so the UI shows the message and renders chips.
function clarificationResponse(
  mensaje: string,
  opciones: ClarOption[]
): Response {
  const meta = JSON.stringify({ type: "clarification", mensaje, opciones });
  return streamMeta(meta, mensaje);
}

// Conversational reply (greeting / small talk / no-data). Streams a meta line
// of type "conversational" + the human message. `opciones` (optional) are the
// rubro chips rendered as a SOFT suggestion below the message — never instead
// of it. Backward compatible: the frontend treats unknown meta types as text.
function conversationalResponse(
  mensaje: string,
  opciones: ClarOption[]
): Response {
  const meta = JSON.stringify({
    type: "conversational",
    mensaje,
    opciones: opciones ?? [],
  });
  return streamMeta(meta, mensaje);
}

// Context describing which intent produced this set of promos, used to build a
// short, friendly intro line.
type PromosCtx =
  | { kind: "comercio"; comercio: string }
  | { kind: "rubro"; rubro: string }
  | { kind: "producto"; producto: string };

// Build the answer for a set of retrieved promos: stream a promos meta line,
// then stream a SHORT, friendly, plain-text intro. No second LLM call — the
// cards already carry every promo's detail, so the text is just a warm lead-in
// built deterministically from the result count. NEVER emits markdown.
function answerWithPromos(promos: unknown[], ctx: PromosCtx): Response {
  const metaPromos: Promo[] = promos.map((row) => normalizePromo(row));
  const meta = JSON.stringify({
    type: "promos",
    source: "real",
    promos: metaPromos,
  });

  const n = metaPromos.length;

  // Zero promos: keep it short and honest (the UI shows no cards).
  if (n === 0) {
    const text =
      ctx.kind === "comercio"
        ? `No encontré promos de ${ctx.comercio} por ahora.`
        : ctx.kind === "rubro"
        ? `No encontré promos de ${ctx.rubro} por ahora.`
        : `No encontré promos para «${ctx.producto}» por ahora.`;
    return streamMeta(meta, text);
  }

  const promoWord = n === 1 ? "promo" : "promos";
  let text: string;
  switch (ctx.kind) {
    case "comercio":
      text = `Estas son las ${promoWord} de ${ctx.comercio} 👇`;
      break;
    case "rubro":
      text = `Encontré ${n} ${promoWord} de ${ctx.rubro} 👇`;
      break;
    case "producto":
    default:
      text = `Te dejo ${n} ${promoWord} que te pueden servir 👇`;
      break;
  }

  return streamMeta(meta, text);
}

// Stream a fixed meta line + a fixed answer text (no LLM call). Used for
// clarifications. Mirrors the meta:{json}\n + text protocol.
function streamMeta(meta: string, text: string): Response {
  const encoder = new TextEncoder();
  const words = text.split(/(\s+)/);
  let i = 0;
  let metaSent = false;

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (!metaSent) {
        controller.enqueue(encoder.encode(`meta:${meta}\n`));
        metaSent = true;
        return;
      }
      if (i >= words.length) {
        controller.close();
        return;
      }
      const chunk = words.slice(i, i + 2).join("");
      i += 2;
      controller.enqueue(encoder.encode(chunk));
      await new Promise((r) => setTimeout(r, 18));
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Descuentito-Source": "real",
    },
  });
}

// Plain-text streaming for the mock path with a small typing delay.
// The stream's FIRST line is always a metadata line — `meta:{json}\n` — that
// carries the structured `promos` array (and source). The client parses that
// first line, then renders the remaining bytes as the streamed answer text.
function streamText(
  text: string,
  opts: { source: string; promos?: Promo[] }
): Response {
  const encoder = new TextEncoder();
  const meta = JSON.stringify({
    type: "promos",
    source: opts.source,
    promos: opts.promos ?? [],
  });
  const words = text.split(/(\s+)/);
  let i = 0;
  let metaSent = false;

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (!metaSent) {
        controller.enqueue(encoder.encode(`meta:${meta}\n`));
        metaSent = true;
        return;
      }
      if (i >= words.length) {
        controller.close();
        return;
      }
      // Emit a few tokens per tick for a natural typing feel.
      const chunk = words.slice(i, i + 2).join("");
      i += 2;
      controller.enqueue(encoder.encode(chunk));
      await new Promise((r) => setTimeout(r, 22));
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Descuentito-Source": opts.source,
    },
  });
}

// Coerce an unknown Supabase row into the Promo shape used by the UI cards.
function normalizePromo(row: unknown): Promo {
  const r = (row ?? {}) as Record<string, unknown>;
  const str = (v: unknown, fallback = ""): string =>
    typeof v === "string" ? v : v != null ? String(v) : fallback;
  const num = (v: unknown): number =>
    typeof v === "number" ? v : Number(v) || 0;
  const dias = Array.isArray(r.dias)
    ? r.dias.map((d) => str(d)).filter(Boolean)
    : str(r.dias)
    ? str(r.dias).split(/\s*,\s*/)
    : [];
  return {
    comercio: str(r.comercio),
    banco_billetera: str(r.banco_billetera),
    rubro: str(r.rubro),
    titulo: str(r.titulo),
    descripcion: str(r.descripcion),
    descuento_pct: num(r.descuento_pct),
    medio_pago: str(r.medio_pago),
    dias,
    // Supabase column is `tope_reintegro`; older rows may use `tope`.
    tope: str(r.tope_reintegro ?? r.tope),
    fecha_hasta: str(r.fecha_hasta),
  };
}
