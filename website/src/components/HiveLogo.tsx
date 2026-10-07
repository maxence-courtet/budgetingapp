// Hive brand mark: three honeycomb cells. The golden cell is "whatever matters most today";
// the outlined cells follow the text colour so the mark works in light and dark themes.
export const HIVE_GOLD = "#F5B31F";

export function HiveMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 37.84 37.77"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <polygon points="18.92,0 27.58,5 27.58,15 18.92,20 10.26,15 10.26,5" fill={HIVE_GOLD} />
      <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round">
        <polygon points="8.66,19.27 16.02,23.52 16.02,32.02 8.66,36.27 1.3,32.02 1.3,23.52" />
        <polygon points="29.18,19.27 36.54,23.52 36.54,32.02 29.18,36.27 21.82,32.02 21.82,23.52" />
      </g>
    </svg>
  );
}

export function HiveLogo({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 text-fg ${className}`}>
      <HiveMark size={size} />
      <span className="font-extrabold tracking-tighter leading-none" style={{ fontSize: size * 0.82 }}>
        hive
      </span>
    </span>
  );
}
