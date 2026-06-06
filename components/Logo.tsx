export function Logo({ size = 38 }: { size?: number }) {
  return (
    <span
      className="logo-mark glass glass-lift inline-flex items-center justify-center rounded-2xl shrink-0"
      style={{
        width: size,
        height: size,
        boxShadow:
          "0 0 24px rgba(34,211,238,0.28), inset 0 1px 0 rgba(255,255,255,0.12)",
      }}
      aria-hidden
    >
      <svg
        width={size * 0.56}
        height={size * 0.56}
        viewBox="0 0 24 24"
        fill="none"
        className="logo-glyph"
      >
        {/* Stylized percent / tag mark in electric cyan */}
        <circle cx="7.5" cy="7.5" r="2.6" stroke="#22d3ee" strokeWidth="2" />
        <circle cx="16.5" cy="16.5" r="2.6" stroke="#22d3ee" strokeWidth="2" />
        <line
          x1="18.5"
          y1="5.5"
          x2="5.5"
          y2="18.5"
          stroke="#22d3ee"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
