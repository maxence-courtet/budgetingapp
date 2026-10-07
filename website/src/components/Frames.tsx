/** A phone bezel around a screenshot; `name` picks /screens/phone-<name>-{light,dark}.webp. */
export function Phone({ name, alt, className = "", priority }: { name: string; alt: string; className?: string; priority?: boolean }) {
  return (
    <div
      className={`rounded-[2.6rem] bg-[#0b0b0c] p-[9px] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.45),0_0_0_1px_rgba(255,255,255,0.06)_inset] ${className}`}
    >
      <div className="relative overflow-hidden rounded-[2.05rem] bg-canvas aspect-[390/844]">
        <Shot src={`/screens/phone-${name}`} alt={alt} priority={priority} />
        <span className="absolute top-2 left-1/2 -translate-x-1/2 h-[22px] w-[30%] rounded-full bg-[#0b0b0c]" aria-hidden="true" />
      </div>
    </div>
  );
}

/** A minimal browser window around a desktop screenshot. */
export function Browser({ name, alt, className = "", priority }: { name: string; alt: string; className?: string; priority?: boolean }) {
  return (
    <div className={`rounded-2xl border border-line-strong bg-surface shadow-[0_30px_80px_-30px_rgba(0,0,0,0.35)] overflow-hidden ${className}`}>
      <div className="flex items-center gap-1.5 px-4 h-9 border-b border-line bg-surface-2" aria-hidden="true">
        <span className="w-2.5 h-2.5 rounded-full bg-line-strong" />
        <span className="w-2.5 h-2.5 rounded-full bg-line-strong" />
        <span className="w-2.5 h-2.5 rounded-full bg-line-strong" />
        <span className="ml-3 h-5 flex-1 max-w-[16rem] rounded-md bg-surface border border-line" />
      </div>
      <div className="aspect-[1600/1012]">
        <Shot src={`/screens/desktop-${name}`} alt={alt} priority={priority} />
      </div>
    </div>
  );
}

function Shot({ src, alt, priority }: { src: string; alt: string; priority?: boolean }) {
  const loading = priority ? "eager" : "lazy";
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`${src}-light.webp`} alt={alt} loading={loading} className="shot-light w-full h-full object-cover object-top" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`${src}-dark.webp`} alt="" aria-hidden="true" loading={loading} className="shot-dark w-full h-full object-cover object-top" />
    </>
  );
}
