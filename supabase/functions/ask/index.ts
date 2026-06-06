// =====================================================================
// supabase/functions/ask/index.ts  |  Descuentito - RAG endpoint (opcional)
// =====================================================================
// Edge Function de referencia (Deno) que implementa el flujo RAG completo
// del lado del servidor. Es una ALTERNATIVA: la app Next.js tiene su propia
// route handler. Este archivo sirve como implementacion canonica/portatil.
//
// Flujo:
//   1) recibe { question } por POST
//   2) embebe la pregunta con OpenAI text-embedding-3-small (1536 dims)
//   3) llama al RPC match_promos via supabase-js
//   4) arma un prompt en espanol con las promos recuperadas (contexto)
//   5) llama a gpt-4o-mini y devuelve { answer, promos }
//
// Deploy:  supabase functions deploy ask --no-verify-jwt
// Secrets: OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//          (SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY suelen inyectarse
//           automaticamente por la plataforma Supabase).
// =====================================================================

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// --- Variables de entorno (se leen desde Deno.env) -------------------
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const EMBEDDING_MODEL = "text-embedding-3-small"; // 1536 dims
const CHAT_MODEL = "gpt-4o-mini";

// Cabeceras CORS para poder invocar la funcion desde el navegador.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Cliente Supabase con service role: la Edge Function corre del lado del
// servidor, asi que puede usar la key privilegiada para llamar al RPC.
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ---------------------------------------------------------------------
// Helper: genera el embedding de un texto via OpenAI.
// ---------------------------------------------------------------------
async function embedQuestion(text: string): Promise<number[]> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: text }),
  });
  if (!res.ok) {
    throw new Error(`OpenAI embeddings error: ${res.status} ${await res.text()}`);
  }
  const json = await res.json();
  return json.data[0].embedding as number[];
}

// ---------------------------------------------------------------------
// Helper: arma el prompt en espanol con el contexto recuperado.
// ---------------------------------------------------------------------
// deno-lint-ignore no-explicit-any
function buildPrompt(question: string, promos: any[]): string {
  // Serializamos cada promo recuperada como un bloque legible.
  const contexto = promos
    .map((p, i) => {
      const dias = Array.isArray(p.dias) ? p.dias.join(", ") : "";
      return [
        `[${i + 1}] Comercio: ${p.comercio}`,
        p.banco_billetera ? `Banco/billetera: ${p.banco_billetera}` : "",
        p.titulo ? `Titulo: ${p.titulo}` : "",
        p.descuento_pct != null ? `Descuento: ${p.descuento_pct}%` : "",
        p.medio_pago ? `Medio de pago: ${p.medio_pago}` : "",
        dias ? `Dias: ${dias}` : "",
        p.tope_reintegro ? `Tope reintegro: ${p.tope_reintegro}` : "",
        p.fecha_hasta ? `Vigente hasta: ${p.fecha_hasta}` : "",
        p.fuente_url ? `Fuente: ${p.fuente_url}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");

  return [
    "Sos un asistente argentino que informa descuentos bancarios y de billeteras vigentes HOY.",
    "Responde SOLO con la informacion del CONTEXTO. Si no hay promos relevantes, deci claramente que no encontraste descuentos vigentes para esa consulta.",
    "Se concreto: menciona comercio, banco/billetera, porcentaje, medio de pago, dias y tope. No inventes promos ni fechas.",
    "",
    "=== CONTEXTO (promociones recuperadas) ===",
    contexto || "(sin resultados)",
    "",
    `=== PREGUNTA DEL USUARIO ===`,
    question,
  ].join("\n");
}

// ---------------------------------------------------------------------
// Handler principal
// ---------------------------------------------------------------------
serve(async (req: Request) => {
  // Preflight CORS.
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { question } = await req.json();
    if (!question || typeof question !== "string") {
      return new Response(
        JSON.stringify({ error: "Falta 'question' (string)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 1) Embed de la pregunta.
    const queryEmbedding = await embedQuestion(question);

    // 2) Recuperacion semantica via RPC match_promos.
    //    filtro_banco / filtro_comercio quedan null (que el ranking semantico
    //    decida); se podrian detectar en la pregunta y pasarlos aca para
    //    filtrar duro por banco/billetera o por comercio.
    const { data: promos, error } = await supabase.rpc("match_promos", {
      query_embedding: queryEmbedding,
      match_count: 5,
      filtro_banco: null,
      filtro_comercio: null,
    });
    if (error) throw error;

    // 3) Prompt en espanol con el contexto recuperado.
    const prompt = buildPrompt(question, promos ?? []);

    // 4) Generacion con gpt-4o-mini.
    const chatRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: CHAT_MODEL,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "Asistente de descuentos en Argentina. Responde en espanol rioplatense, claro y breve.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!chatRes.ok) {
      throw new Error(`OpenAI chat error: ${chatRes.status} ${await chatRes.text()}`);
    }
    const chatJson = await chatRes.json();
    const answer = chatJson.choices?.[0]?.message?.content ?? "";

    // 5) Respuesta: incluimos las promos usadas para depurar / citar fuentes.
    return new Response(
      JSON.stringify({ answer, promos: promos ?? [] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("ask error:", err);
    return new Response(
      JSON.stringify({ error: String(err?.message ?? err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
