"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
  type Transition,
  type Variants,
} from "framer-motion";
import { Logo } from "../components/Logo";
import type { Promo } from "../lib/mock-promos";

// Clickable example prompts shown on the landing screen — make it obvious what
// you can ask. Each triggers a real search on click.
const SUGGESTIONS = [
  "Farmacity",
  "zapatillas",
  "indumentaria",
  "Starbucks",
  "qué descuentos tenés",
];

// Spring tuned to feel like a confident, settled "rise" (Apple/Linear-ish).
const RISE_SPRING: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 30,
  mass: 0.9,
};

interface ClarOption {
  label: string;
  value: string;
  count?: number;
}

interface ResultState {
  question: string;
  answer: string;
  promos: Promo[];
  // When the backend asks the user to narrow down (clarification) OR softly
  // suggests categories (conversational), these clickable chips appear.
  clarOptions: ClarOption[];
  // True when the reply is conversational (greeting / no-data / small talk):
  // the answer renders as a chat bubble and no promo grid is expected.
  conversational: boolean;
}

export default function Home() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResultState | null>(null);
  // True only while the answer text is actively streaming in (drives caret).
  const [streaming, setStreaming] = useState(false);
  // Browsable categories (with counts) for the landing screen. Fetched once.
  const [categories, setCategories] = useState<ClarOption[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const reduceMotion = useReducedMotion();

  const hasStarted = result !== null || loading;

  // Total promos across categories — powers the "N promos vigentes" indicator.
  const totalPromos = categories.reduce((sum, c) => sum + (c.count ?? 0), 0);

  // Load browsable categories for the empty/landing state (lightweight GET).
  useEffect(() => {
    let alive = true;
    fetch("/api/ask")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { opciones?: ClarOption[] } | null) => {
        if (alive && data && Array.isArray(data.opciones)) {
          setCategories(data.opciones);
        }
      })
      .catch(() => {
        /* landing chips are optional — ignore */
      });
    return () => {
      alive = false;
    };
  }, []);

  const send = useCallback(
    async (text: string) => {
      const question = text.trim();
      if (!question || loading) return;

      setInput("");
      setLoading(true);
      setStreaming(false);
      // Reset the results area for the new query (replace, not stack).
      setResult({
        question,
        answer: "",
        promos: [],
        clarOptions: [],
        conversational: false,
      });

      try {
        const res = await fetch("/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question }),
        });

        if (!res.ok || !res.body) {
          throw new Error(`status ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let acc = "";
        let metaParsed = false;
        let firstAnswer = true;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });

          // The first line is `meta:{json}` — parse it once, then strip it.
          if (!metaParsed) {
            const nl = acc.indexOf("\n");
            if (nl === -1) continue; // wait for the full meta line
            const firstLine = acc.slice(0, nl);
            acc = acc.slice(nl + 1);
            metaParsed = true;
            if (firstLine.startsWith("meta:")) {
              try {
                const meta = JSON.parse(firstLine.slice(5)) as {
                  type?: string;
                  promos?: Promo[];
                  opciones?: ClarOption[];
                };
                const promos = Array.isArray(meta.promos) ? meta.promos : [];
                // Chips accompany both "clarification" and "conversational"
                // (the latter as a soft suggestion under the bubble).
                const hasChips =
                  (meta.type === "clarification" ||
                    meta.type === "conversational") &&
                  Array.isArray(meta.opciones);
                const clarOptions = hasChips
                  ? (meta.opciones as ClarOption[])
                  : [];
                const conversational =
                  meta.type === "conversational" || meta.type === "clarification";
                setResult((prev) =>
                  prev
                    ? { ...prev, promos, clarOptions, conversational }
                    : prev
                );
              } catch {
                // ignore malformed meta — answer still renders
              }
            } else {
              // No meta marker (legacy): treat the whole buffer as answer.
              acc = firstLine + "\n" + acc;
            }
          }

          if (metaParsed) {
            if (firstAnswer) {
              setLoading(false);
              setStreaming(true);
              firstAnswer = false;
            }
            const answer = acc;
            setResult((prev) => (prev ? { ...prev, answer } : prev));
          }
        }
      } catch (err) {
        console.error(err);
        setResult((prev) =>
          prev
            ? {
                ...prev,
                answer:
                  "Uf, algo falló al consultar los descuentos. Probá de nuevo en un momento.",
              }
            : prev
        );
      } finally {
        setLoading(false);
        setStreaming(false);
        inputRef.current?.focus();
      }
    },
    [loading]
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  return (
    <main className="relative mx-auto flex min-h-[100dvh] w-full max-w-[720px] flex-col px-4 pb-6 pt-6 sm:px-6">
      <LayoutGroup>
        {/* Top spacer: tall (centers the hero) when idle, collapses on first
            query so the search bar rises — animated with a spring height. */}
        <motion.div
          aria-hidden
          initial={false}
          animate={{ height: hasStarted ? 0 : "26vh" }}
          transition={reduceMotion ? { duration: 0 } : RISE_SPRING}
          style={{ flex: "0 0 auto" }}
        />

        {/* HERO: logo + title + search bar + suggestions. Sticks to top once
            results are showing. `layout` makes the resize/reposition buttery. */}
        <motion.section
          layout
          transition={reduceMotion ? { duration: 0 } : RISE_SPRING}
          className={
            hasStarted
              ? "sticky top-0 z-20 -mx-4 bg-gradient-to-b from-black via-black/85 to-transparent px-4 pb-4 pt-2 backdrop-blur-sm sm:-mx-6 sm:px-6"
              : ""
          }
        >
          {/* Brand mark */}
          <motion.div
            layout
            transition={reduceMotion ? { duration: 0 } : RISE_SPRING}
            className={
              hasStarted
                ? "mb-3 flex items-center gap-3"
                : "mb-7 flex flex-col items-center gap-3 text-center"
            }
          >
            <motion.div layout="position">
              <Logo size={hasStarted ? 40 : 56} />
            </motion.div>
            <motion.div layout="position" className={hasStarted ? "min-w-0" : ""}>
              <motion.h1
                layout="position"
                className={
                  hasStarted
                    ? "text-[20px] font-bold leading-[1.05] tracking-[-0.02em]"
                    : "text-[30px] font-bold leading-[1.05] tracking-[-0.025em] sm:text-[36px]"
                }
              >
                Descuentito
              </motion.h1>
              <AnimatePresence>
                {!hasStarted && (
                  <motion.p
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    className="mt-1.5 text-[14px] font-light leading-snug tracking-[0.01em] text-white/55"
                  >
                    Encontrá el mejor descuento en segundos. Decime una marca,
                    un rubro o un producto.
                    {totalPromos > 0 && (
                      <span className="mt-1.5 flex items-center justify-center gap-1.5 text-[12px] text-white/40">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#22d3ee] shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                        {totalPromos} promos vigentes
                      </span>
                    )}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>

          {/* Search / command bar */}
          <motion.form
            layout
            transition={reduceMotion ? { duration: 0 } : RISE_SPRING}
            onSubmit={onSubmit}
            className="relative"
          >
            {!hasStarted && (
              <span className="hero-glow animate-glow-pulse" aria-hidden />
            )}
            <div className="search-bar glass glass-lift flex items-center gap-2 rounded-full p-2 pl-5">
              <SearchIcon />
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Probá: Farmacity, zapatillas, electro…"
                enterKeyHint="search"
                autoFocus
                className="caret-[#22d3ee] min-w-0 flex-1 bg-transparent text-[15px] text-white placeholder:text-white/35 focus:outline-none sm:text-[16px]"
              />
              <motion.button
                type="submit"
                disabled={!input.trim() || loading}
                aria-label="Buscar"
                whileHover={
                  reduceMotion
                    ? undefined
                    : {
                        scale: 1.06,
                        boxShadow: "0 0 26px rgba(34,211,238,0.7)",
                      }
                }
                whileTap={reduceMotion ? undefined : { scale: 0.92 }}
                transition={{ type: "spring", stiffness: 500, damping: 22 }}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-black disabled:opacity-35"
                style={{ background: "#22d3ee" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M4 12L20 4L13 20L11 13L4 12Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                </svg>
              </motion.button>
            </div>
          </motion.form>

          {/* Landing-only discovery: example prompts + browsable categories. */}
          <AnimatePresence>
            {!hasStarted && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.2 } }}
                className="mt-5"
              >
                {/* Quick example prompts */}
                <motion.div
                  variants={CHIPS_CONTAINER}
                  initial="hidden"
                  animate="show"
                  className="flex flex-wrap items-center justify-center gap-2"
                >
                  <motion.span
                    variants={CHIP_ITEM}
                    className="text-[12px] font-light text-white/35"
                  >
                    Probá:
                  </motion.span>
                  {SUGGESTIONS.map((s) => (
                    <motion.button
                      key={s}
                      variants={CHIP_ITEM}
                      onClick={() => send(s)}
                      whileHover={
                        reduceMotion
                          ? undefined
                          : {
                              y: -2,
                              borderColor: "rgba(34,211,238,0.45)",
                              boxShadow: "0 0 22px rgba(34,211,238,0.22)",
                            }
                      }
                      whileTap={reduceMotion ? undefined : { scale: 0.96 }}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 24,
                      }}
                      className="glass rounded-full px-3.5 py-1.5 text-[13px] text-white/80 transition-colors duration-200 hover:text-white"
                    >
                      {s}
                    </motion.button>
                  ))}
                </motion.div>

                {/* Browsable categories with live counts */}
                {categories.length > 0 && (
                  <div className="mt-7">
                    <p className="mb-3 text-center text-[12px] uppercase tracking-[0.14em] text-white/30">
                      Explorá por rubro
                    </p>
                    <motion.div
                      variants={CHIPS_CONTAINER}
                      initial="hidden"
                      animate="show"
                      className="flex flex-wrap justify-center gap-2"
                    >
                      {categories.map((opt) => (
                        <CategoryChip
                          key={opt.value}
                          opt={opt}
                          reduceMotion={!!reduceMotion}
                          onClick={() => send(opt.value)}
                        />
                      ))}
                    </motion.div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>

        {/* RESULTS — answer text + promo cards, below the search bar */}
        {hasStarted && (
          <div className="chat-scroll mt-5 flex-1 overflow-y-auto pb-2">
            {result && result.question && (
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="mb-3 text-[13px] font-light text-white/40"
              >
                <span className="text-white/60">Buscaste:</span>{" "}
                {result.question}
              </motion.p>
            )}

            <AnimatePresence mode="wait" initial={false}>
              {loading && !result?.answer ? (
                <AnswerSkeleton key="skeleton" />
              ) : (
                result && (
                  <motion.div
                    key="answer"
                    initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    className="flex items-start gap-3"
                  >
                    {/* Assistant avatar dot — reinforces the chat feel */}
                    <span
                      aria-hidden
                      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px]"
                      style={{
                        background:
                          "linear-gradient(180deg,rgba(34,211,238,0.25),rgba(34,211,238,0.08))",
                        border: "1px solid rgba(34,211,238,0.35)",
                        boxShadow: "0 0 16px rgba(34,211,238,0.18)",
                      }}
                    >
                      🏷️
                    </span>
                    <div className="glass glass-lift max-w-full flex-1 rounded-bubble rounded-tl-md px-5 py-4 text-[15px] leading-relaxed text-white/90">
                      <FormattedText
                        content={result.answer}
                        streaming={streaming}
                      />
                    </div>
                  </motion.div>
                )
              )}
            </AnimatePresence>

            {result && result.clarOptions.length > 0 && (
              <motion.div
                variants={CHIPS_CONTAINER}
                initial="hidden"
                animate="show"
                className="ml-10 mt-3 flex flex-wrap gap-2"
              >
                {result.clarOptions.map((opt) => (
                  <CategoryChip
                    key={opt.value}
                    opt={opt}
                    reduceMotion={!!reduceMotion}
                    onClick={() => send(opt.value)}
                  />
                ))}
              </motion.div>
            )}

            {result && result.promos.length > 0 && (
              <motion.div
                variants={CARDS_CONTAINER}
                initial="hidden"
                animate="show"
                className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2"
              >
                {[...result.promos]
                  .sort((a, b) => b.descuento_pct - a.descuento_pct)
                  .map((p, i) => (
                    <PromoCard key={`${p.comercio}-${i}`} promo={p} />
                  ))}
              </motion.div>
            )}
          </div>
        )}
      </LayoutGroup>

      <p className="px-2 pt-4 text-center text-[11px] font-light text-white/25">
        Datos de demostración. Verificá las condiciones en cada comercio.
      </p>
    </main>
  );
}

// ---- Stagger variants ----------------------------------------------------

const CHIPS_CONTAINER: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.07, delayChildren: 0.15 },
  },
};

const CHIP_ITEM: Variants = {
  hidden: { opacity: 0, y: 10, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 420, damping: 28 },
  },
};

const CARDS_CONTAINER: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.075, delayChildren: 0.05 },
  },
};

const CARD_ITEM: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.98, filter: "blur(8px)" },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

// Shared glass chip with an optional count badge. Used for landing categories
// and for clarification/conversational suggestions in the results area.
function CategoryChip({
  opt,
  reduceMotion,
  onClick,
}: {
  opt: ClarOption;
  reduceMotion: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      variants={CHIP_ITEM}
      onClick={onClick}
      whileHover={
        reduceMotion
          ? undefined
          : {
              y: -2,
              borderColor: "rgba(34,211,238,0.45)",
              boxShadow: "0 0 22px rgba(34,211,238,0.22)",
            }
      }
      whileTap={reduceMotion ? undefined : { scale: 0.96 }}
      transition={{ type: "spring", stiffness: 400, damping: 24 }}
      className="glass flex items-center gap-2 rounded-full px-3.5 py-2 text-[13px] text-white/80 transition-colors duration-200 hover:text-white"
    >
      <span>{opt.label}</span>
      {typeof opt.count === "number" && opt.count > 0 && (
        <span
          className="rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none text-black"
          style={{ background: "#22d3ee" }}
        >
          {opt.count}
        </span>
      )}
    </motion.button>
  );
}

function PromoCard({ promo }: { promo: Promo }) {
  return (
    <motion.article
      variants={CARD_ITEM}
      whileHover={{
        y: -4,
        boxShadow:
          "0 14px 50px rgba(0,0,0,0.5), 0 0 34px rgba(34,211,238,0.16)",
      }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
      className="glass glass-lift group relative flex flex-col gap-3 overflow-hidden rounded-card p-4"
    >
      {/* Header: store + rubro tag, prominent discount badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold tracking-[-0.01em] text-white">
            {promo.comercio}
          </p>
          {promo.rubro && (
            <span className="mt-1 inline-block rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10.5px] uppercase tracking-[0.08em] text-white/45">
              {promo.rubro}
            </span>
          )}
        </div>
        {promo.descuento_pct > 0 && (
          <span
            className="shrink-0 rounded-2xl px-3 py-1.5 text-[19px] font-extrabold leading-none tracking-[-0.02em] text-black"
            style={{
              background: "linear-gradient(180deg,#5ce8f8 0%,#22d3ee 100%)",
              boxShadow:
                "0 0 22px rgba(34,211,238,0.5), inset 0 1px 0 rgba(255,255,255,0.45)",
            }}
          >
            {promo.descuento_pct}%
          </span>
        )}
      </div>

      {promo.titulo && (
        <p className="text-[14px] leading-snug text-white/85">{promo.titulo}</p>
      )}

      {/* Payment method, highlighted as the key actionable detail */}
      {promo.banco_billetera && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#22d3ee]/25 bg-[#22d3ee]/[0.08] px-2.5 py-1 text-[12px] font-medium text-[#7fe9f6]">
            <CardIcon />
            {promo.banco_billetera}
          </span>
        </div>
      )}

      <div className="mt-auto flex flex-col gap-1.5 pt-1 text-[12.5px] text-white/55">
        {promo.medio_pago && promo.medio_pago !== promo.banco_billetera && (
          <Meta label="Medio de pago" value={promo.medio_pago} />
        )}
        {promo.dias.length > 0 && (
          <Meta label="Días" value={promo.dias.join(", ")} />
        )}
        {promo.tope && <Meta label="Tope" value={promo.tope} highlight />}
        {promo.fecha_hasta && (
          <Meta
            label="Vigencia"
            value={`hasta ${formatDate(promo.fecha_hasta)}`}
          />
        )}
      </div>
    </motion.article>
  );
}

function Meta({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="shrink-0 text-white/35">{label}:</span>
      <span className={highlight ? "font-medium text-white/90" : "text-white/75"}>
        {value}
      </span>
    </div>
  );
}

function CardIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="2.5"
        y="5"
        width="19"
        height="14"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="2"
      />
      <line
        x1="2.5"
        y1="9.5"
        x2="21.5"
        y2="9.5"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function SearchIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      className="shrink-0"
      aria-hidden
    >
      <circle cx="11" cy="11" r="6.5" stroke="#22d3ee" strokeWidth="2" />
      <line
        x1="16.5"
        y1="16.5"
        x2="21"
        y2="21"
        stroke="#22d3ee"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Minimal markdown-ish renderer for the assistant text (bold + italic + lines).
// While streaming, a soft cyan caret blinks at the very end of the text.
function FormattedText({
  content,
  streaming,
}: {
  content: string;
  streaming?: boolean;
}) {
  const lines = content.split("\n");
  const lastIdx = lines.length - 1;
  return (
    <>
      {lines.map((line, i) => (
        <p
          key={i}
          className={line.trim() === "" ? "h-2" : "whitespace-pre-wrap"}
        >
          {renderInline(line)}
          {streaming && i === lastIdx && <span className="stream-caret" />}
        </p>
      ))}
    </>
  );
}

function renderInline(line: string): React.ReactNode {
  // Handle *bold* and _italic_ simple markers.
  const tokens = line.split(/(\*[^*]+\*|_[^_]+_)/g);
  return tokens.map((t, i) => {
    if (t.startsWith("*") && t.endsWith("*") && t.length > 2) {
      return (
        <strong key={i} className="font-semibold text-white">
          {t.slice(1, -1)}
        </strong>
      );
    }
    if (t.startsWith("_") && t.endsWith("_") && t.length > 2) {
      return (
        <em key={i} className="text-white/50">
          {t.slice(1, -1)}
        </em>
      );
    }
    return <span key={i}>{t}</span>;
  });
}

// Premium shimmer skeleton shown while waiting for the first answer chunk.
function AnswerSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, filter: "blur(6px)" }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="glass glass-lift flex flex-col gap-3 rounded-card px-5 py-4"
      aria-label="Cargando respuesta"
    >
      <div className="shimmer-line h-3.5 w-[85%]" />
      <div className="shimmer-line h-3.5 w-[70%]" />
      <div className="shimmer-line h-3.5 w-[55%]" />
    </motion.div>
  );
}
