"use client";

// Hand-drawn scheduling-themed SVG stickers scattered in the background.
// Each is positioned absolutely, pointer-events none, low opacity.

const S = {
  fill: "none" as const,
  stroke: "#1a1a1a",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function Sticker({
  children, x, y, size, rot, anim, delay, opacity = 0.18,
}: {
  children: React.ReactNode;
  x: string; y: string; size: number; rot: number;
  anim: string; delay?: string; opacity?: number;
}) {
  return (
    <div
      className={anim}
      style={{
        position: "absolute", left: x, top: y,
        width: size, height: size,
        transform: `rotate(${rot}deg)`,
        ["--rot" as string]: `${rot}deg`,
        opacity,
        animationDelay: delay ?? "0s",
        pointerEvents: "none",
      }}
    >
      {children}
    </div>
  );
}

// ── Individual doodles ───────────────────────────────────────────

function Calendar() {
  return (
    <svg viewBox="0 0 90 90" fill="none" strokeLinecap="round" strokeLinejoin="round">
      {/* Body */}
      <path d="M10 22 Q9 17 15 17 L75 17 Q81 17 80 22 L80 76 Q80 82 75 81 L15 81 Q9 81 10 76 Z"
        stroke="#1a1a1a" strokeWidth="2.5" fill="white" fillOpacity={0.5} />
      {/* Top bar */}
      <path d="M10 32 Q45 31 80 32" stroke="#1a1a1a" strokeWidth="2" />
      {/* Hooks */}
      <path d="M28 12 L28 22" stroke="#1a1a1a" strokeWidth="3" />
      <path d="M62 12 L62 22" stroke="#1a1a1a" strokeWidth="3" />
      {/* Dots: 4×3 grid */}
      {[20,34,48,62].map(cx => [44,58,72].map(cy => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={3} fill="#1a1a1a" opacity={0.4} />
      )))}
      {/* Circled date */}
      <circle cx="48" cy="58" r="7" stroke="#22c55e" strokeWidth="2.5" />
    </svg>
  );
}

function Clock() {
  return (
    <svg viewBox="0 0 80 80" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="40" cy="40" r="33" stroke="#1a1a1a" strokeWidth="2.5" fill="white" fillOpacity={0.5} />
      {/* Tick marks */}
      {[0,90,180,270].map(a => {
        const rad = (a - 90) * Math.PI / 180;
        const x1 = 40 + 26 * Math.cos(rad), y1 = 40 + 26 * Math.sin(rad);
        const x2 = 40 + 31 * Math.cos(rad), y2 = 40 + 31 * Math.sin(rad);
        return <line key={a} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#1a1a1a" strokeWidth="2" />;
      })}
      {/* Hour hand (pointing ~10) */}
      <path d="M40 40 L28 20" stroke="#1a1a1a" strokeWidth="3" />
      {/* Minute hand (pointing ~2) */}
      <path d="M40 40 L57 32" stroke="#1a1a1a" strokeWidth="2.5" />
      <circle cx="40" cy="40" r="3.5" fill="#1a1a1a" />
    </svg>
  );
}

function Star() {
  return (
    <svg viewBox="0 0 60 60" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M30 4 L34 22 L52 22 L38 33 L43 51 L30 41 L17 51 L22 33 L8 22 L26 22 Z"
        stroke="#1a1a1a" strokeWidth="2.5" fill="#fef08a" fillOpacity={0.6} />
    </svg>
  );
}

function People() {
  return (
    <svg viewBox="0 0 90 85" fill="none" strokeLinecap="round" strokeLinejoin="round">
      {/* Person 1 */}
      <circle cx="22" cy="14" r="9" stroke="#1a1a1a" strokeWidth="2.2" fill="white" fillOpacity={0.6} />
      <path d="M22 23 Q21 36 22 50" stroke="#1a1a1a" strokeWidth="2.2" />
      <path d="M8 35 Q22 32 36 35" stroke="#1a1a1a" strokeWidth="2.2" />
      <path d="M22 50 Q16 62 13 72" stroke="#1a1a1a" strokeWidth="2.2" />
      <path d="M22 50 Q28 62 31 72" stroke="#1a1a1a" strokeWidth="2.2" />
      {/* Person 2 */}
      <circle cx="65" cy="14" r="9" stroke="#1a1a1a" strokeWidth="2.2" fill="white" fillOpacity={0.6} />
      <path d="M65 23 Q64 36 65 50" stroke="#1a1a1a" strokeWidth="2.2" />
      <path d="M51 35 Q65 32 79 35" stroke="#1a1a1a" strokeWidth="2.2" />
      <path d="M65 50 Q59 62 56 72" stroke="#1a1a1a" strokeWidth="2.2" />
      <path d="M65 50 Q71 62 74 72" stroke="#1a1a1a" strokeWidth="2.2" />
      {/* Heart between them */}
      <path d="M42 30 Q38 25 43 22 Q48 19 43 28 Z" stroke="#ef4444" strokeWidth="1.5" fill="#fca5a5" fillOpacity={0.7} />
      <path d="M43 30 Q47 25 42 22 Q37 19 43 28 Z" stroke="#ef4444" strokeWidth="1.5" fill="#fca5a5" fillOpacity={0.7} />
    </svg>
  );
}

function CurvedArrow() {
  return (
    <svg viewBox="0 0 90 70" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 55 Q15 20 65 12" stroke="#1a1a1a" strokeWidth="2.8" />
      <path d="M55 6 L67 13 L59 25" stroke="#1a1a1a" strokeWidth="2.5" />
    </svg>
  );
}

function Checkmark() {
  return (
    <svg viewBox="0 0 70 70" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="35" cy="35" r="30" stroke="#22c55e" strokeWidth="2.5" fill="#dcfce7" fillOpacity={0.7} />
      <path d="M18 36 L29 49 L53 21" stroke="#16a34a" strokeWidth="3.5" />
    </svg>
  );
}

function SpeechBubble() {
  return (
    <svg viewBox="0 0 110 75" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 10 Q10 6 14 6 L96 6 Q100 6 100 10 L100 50 Q100 54 96 54 L50 54 L40 68 L43 54 L14 54 Q10 54 10 50 Z"
        stroke="#1a1a1a" strokeWidth="2.5" fill="white" fillOpacity={0.85} />
      <text x="26" y="36" fontFamily="var(--font-caveat)" fontSize="18" fill="#1a1a1a" fontWeight="700">when?</text>
    </svg>
  );
}

function Pencil() {
  return (
    <svg viewBox="0 0 40 100" fill="none" strokeLinecap="round" strokeLinejoin="round">
      {/* Body */}
      <path d="M10 8 L30 8 L30 72 L20 88 L10 72 Z" stroke="#1a1a1a" strokeWidth="2.2" fill="#fef9c3" fillOpacity={0.8} />
      {/* Eraser top */}
      <path d="M10 8 L30 8 L30 18 L10 18 Z" stroke="#1a1a1a" strokeWidth="2" fill="#fca5a5" fillOpacity={0.7} />
      {/* Center line */}
      <path d="M20 18 L20 72" stroke="#1a1a1a" strokeWidth="1.5" />
      {/* Tip */}
      <path d="M10 72 L20 88 L30 72" stroke="#1a1a1a" strokeWidth="2" fill="#d97706" fillOpacity={0.5} />
    </svg>
  );
}

function Sparkles() {
  return (
    <svg viewBox="0 0 100 55" fill="none" strokeLinecap="round" strokeLinejoin="round">
      {/* Big center star */}
      <path d="M50 5 L54 20 L70 20 L57 30 L62 46 L50 36 L38 46 L43 30 L30 20 L46 20 Z"
        stroke="#1a1a1a" strokeWidth="2" fill="#fef08a" fillOpacity={0.7} />
      {/* Small left star */}
      <path d="M12 28 L14 22 L16 28 L22 30 L16 32 L14 38 L12 32 L6 30 Z"
        stroke="#1a1a1a" strokeWidth="1.5" fill="#fef08a" fillOpacity={0.6} />
      {/* Small right star */}
      <path d="M84 20 L86 14 L88 20 L94 22 L88 24 L86 30 L84 24 L78 22 Z"
        stroke="#1a1a1a" strokeWidth="1.5" fill="#fef08a" fillOpacity={0.6} />
    </svg>
  );
}

function WavyLine() {
  return (
    <svg viewBox="0 0 130 50" fill="none" strokeLinecap="round">
      <path d="M5 18 Q22 6 38 18 Q55 30 72 18 Q89 6 106 18 Q115 24 126 18"
        stroke="#1a1a1a" strokeWidth="2.5" />
      <path d="M5 33 Q22 21 38 33 Q55 45 72 33 Q89 21 106 33 Q115 39 126 33"
        stroke="#1a1a1a" strokeWidth="2.5" />
    </svg>
  );
}

function LinkChain() {
  return (
    <svg viewBox="0 0 90 50" fill="none" strokeLinecap="round" strokeLinejoin="round">
      {/* Left ring */}
      <path d="M32 25 Q32 8 22 8 Q8 8 8 25 Q8 42 22 42 L32 42" stroke="#1a1a1a" strokeWidth="2.5" />
      {/* Right ring */}
      <path d="M58 25 Q58 8 68 8 Q82 8 82 25 Q82 42 68 42 L58 42" stroke="#1a1a1a" strokeWidth="2.5" />
      {/* Connection */}
      <path d="M32 25 L58 25" stroke="#1a1a1a" strokeWidth="2.5" />
    </svg>
  );
}

function ExclamationBurst() {
  return (
    <svg viewBox="0 0 70 70" fill="none" strokeLinecap="round" strokeLinejoin="round">
      {/* Burst shape */}
      <path d="M35 2 L39 18 L53 8 L48 24 L64 22 L54 34 L68 40 L53 44 L58 60 L44 52 L40 68 L35 52 L30 68 L26 52 L12 60 L17 44 L2 40 L16 34 L6 22 L22 24 L17 8 L31 18 Z"
        stroke="#1a1a1a" strokeWidth="2" fill="#fef08a" fillOpacity={0.6} />
      <text x="29" y="42" fontFamily="var(--font-caveat)" fontSize="22" fill="#1a1a1a" fontWeight="700">!</text>
    </svg>
  );
}

// ── Main component ────────────────────────────────────────────────

export default function DoodleBackground() {
  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none select-none"
      aria-hidden="true"
      style={{ zIndex: 0 }}
    >
      {/* Top-left: Calendar */}
      <Sticker x="3%" y="6%" size={100} rot={-14} anim="doodle-float" delay="0s" opacity={0.22}>
        <Calendar />
      </Sticker>

      {/* Top-right: Clock */}
      <Sticker x="83%" y="5%" size={85} rot={12} anim="doodle-wobble" delay="0.8s" opacity={0.2}>
        <Clock />
      </Sticker>

      {/* Far right mid: Checkmark */}
      <Sticker x="88%" y="40%" size={72} rot={-10} anim="doodle-float" delay="1.2s" opacity={0.22}>
        <Checkmark />
      </Sticker>

      {/* Left mid: People */}
      <Sticker x="1%" y="48%" size={105} rot={-6} anim="doodle-wobble" delay="0.4s" opacity={0.2}>
        <People />
      </Sticker>

      {/* Bottom-left: Curved arrow */}
      <Sticker x="4%" y="78%" size={95} rot={8} anim="doodle-float" delay="0.2s" opacity={0.18}>
        <CurvedArrow />
      </Sticker>

      {/* Bottom-right: Wavy lines */}
      <Sticker x="72%" y="82%" size={130} rot={-5} anim="doodle-wobble" delay="1.5s" opacity={0.15}>
        <WavyLine />
      </Sticker>

      {/* Top-center-right: Sparkles */}
      <Sticker x="55%" y="2%" size={95} rot={5} anim="doodle-spin" delay="0s" opacity={0.2}>
        <Sparkles />
      </Sticker>

      {/* Right: Speech bubble */}
      <Sticker x="78%" y="60%" size={115} rot={6} anim="doodle-float" delay="2s" opacity={0.2}>
        <SpeechBubble />
      </Sticker>

      {/* Left upper: Pencil */}
      <Sticker x="18%" y="3%" size={50} rot={-35} anim="doodle-wobble" delay="0.6s" opacity={0.18}>
        <Pencil />
      </Sticker>

      {/* Bottom center-left: Link chain */}
      <Sticker x="30%" y="86%" size={95} rot={-8} anim="doodle-float" delay="1s" opacity={0.16}>
        <LinkChain />
      </Sticker>

      {/* Mid-right: Star */}
      <Sticker x="72%" y="28%" size={58} rot={22} anim="doodle-spin" delay="0s" opacity={0.2}>
        <Star />
      </Sticker>

      {/* Bottom-right area: Burst */}
      <Sticker x="58%" y="74%" size={72} rot={-15} anim="doodle-wobble" delay="1.8s" opacity={0.18}>
        <ExclamationBurst />
      </Sticker>
    </div>
  );
}
