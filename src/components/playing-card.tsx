const SIZES = {
  sm: { box: "h-[4.5rem] w-12 rounded-lg", big: "text-2xl", corner: "text-[0.6rem]" },
  md: { box: "h-24 w-16 rounded-xl", big: "text-3xl", corner: "text-xs" },
  lg: { box: "h-36 w-24 rounded-2xl", big: "text-5xl", corner: "text-sm" },
  // Responsive sizes: smaller on phones.
  hand: { box: "h-[4.5rem] w-12 rounded-lg sm:h-24 sm:w-16 sm:rounded-xl", big: "text-2xl sm:text-3xl", corner: "text-[0.6rem] sm:text-xs" },
  hero: { box: "h-28 w-[4.5rem] rounded-xl sm:h-36 sm:w-24 sm:rounded-2xl", big: "text-4xl sm:text-5xl", corner: "text-xs sm:text-sm" },
};

type Size = keyof typeof SIZES;

/** The face of a card: big centered value plus mirrored corner indices. */
export function CardFace({ value, size = "md", highlight = false }: { value: string; size?: Size; highlight?: boolean }) {
  const s = SIZES[size];
  return (
    <div
      className={`relative flex items-center justify-center bg-card-face font-bold text-card-ink shadow-[0_1px_0_rgba(26,30,58,.08),0_6px_16px_-6px_rgba(26,30,58,.35)] ${s.box} ${
        highlight ? "ring-4 ring-marigold" : "ring-1 ring-black/5"
      }`}
    >
      <span className={`absolute top-1.5 left-2 leading-none ${s.corner}`}>{value}</span>
      <span className={`leading-none tracking-tight ${s.big}`}>{value}</span>
      <span className={`absolute right-2 bottom-1.5 rotate-180 leading-none ${s.corner}`}>{value}</span>
    </div>
  );
}

export function CardBack({ size = "md" }: { size?: Size }) {
  return <div className={`card-back shadow-[0_6px_16px_-6px_rgba(26,30,58,.45)] ${SIZES[size].box}`} />;
}

export function EmptySlot({ size = "md" }: { size?: Size }) {
  return <div className={`border-2 border-dashed border-line ${SIZES[size].box}`} />;
}

/** A seat card that flips from its back to its face when `faceUp` turns true. */
export function FlipCard({ value, faceUp, size = "md", delay = 0 }: { value: string | null; faceUp: boolean; size?: Size; delay?: number }) {
  return (
    <div className="perspective-[600px]">
      <div
        className={`flip relative transform-3d ${faceUp ? "rotate-y-180" : ""}`}
        style={{ "--delay": `${delay}ms` } as React.CSSProperties}
      >
        <div className="backface-hidden">
          <CardBack size={size} />
        </div>
        <div className="absolute inset-0 rotate-y-180 backface-hidden">
          <CardFace value={value ?? ""} size={size} />
        </div>
      </div>
    </div>
  );
}
