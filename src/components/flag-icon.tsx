/**
 * Small inline SVG flags for the locale switcher — not emoji. Windows
 * (confirmed live, this session) has no glyph for at least the Syria flag
 * and silently falls back to rendering the raw two-letter region code
 * ("SY") as plain text next to the language name, which reads as a bug,
 * not a flag. Emoji flag support is inconsistent enough across platforms
 * that a real (if simplified) SVG is the safer choice for something this
 * visible.
 */

const STAR_PATH =
  "M0,-3.2 0.735,-1.011 3.043,-0.988 1.189,0.386 1.881,2.589 0,1.25 -1.881,2.589 -1.189,0.386 -3.043,-0.988 -0.735,-1.011 Z";

/** Simplified Union Jack — the diagonal red/white crosses are centered
 *  rather than historically offset, a common simplification at icon size. */
export function GbFlag({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 40" className={className} aria-hidden="true">
      <rect width="60" height="40" fill="#00247d" />
      <path d="M0 0 60 40 M60 0 0 40" stroke="#fff" strokeWidth="8" />
      <path d="M0 0 60 40 M60 0 0 40" stroke="#cf142b" strokeWidth="3.2" />
      <path d="M30 0 V40 M0 20 H60" stroke="#fff" strokeWidth="13" />
      <path d="M30 0 V40 M0 20 H60" stroke="#cf142b" strokeWidth="7.8" />
    </svg>
  );
}

/** Current Syrian flag (adopted 2024): green/white/black, three red stars —
 *  matches what masar-center.de itself uses for Arabic, checked live. */
export function SyFlag({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 40" className={className} aria-hidden="true">
      <rect width="60" height="40" fill="#000" />
      <rect width="60" height="13.34" y="0" fill="#007a3d" />
      <rect width="60" height="13.33" y="13.34" fill="#fff" />
      <g fill="#ce1126">
        <path d={STAR_PATH} transform="translate(20,20)" />
        <path d={STAR_PATH} transform="translate(30,20)" />
        <path d={STAR_PATH} transform="translate(40,20)" />
      </g>
    </svg>
  );
}
