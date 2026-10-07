/**
 * A phone around a screenshot; `name` picks /screens/phone-<name>-{light,dark}.webp (390×770 shots).
 * A status bar with the camera on top and a home indicator below make up the full 390×844 screen, so the
 * camera never covers the app's own header. Sizes are in container units, so it scales with its width.
 */
export function Phone({ name, alt, className = "", priority }: { name: string; alt: string; className?: string; priority?: boolean }) {
  return (
    // Padding in % follows the containing block, not the phone, so the bezel is sized in units of the
    // phone's own width (the wrapper is the container).
    <div className={`@container ${className}`}>
      <div className="rounded-[15%/7%] bg-[#1c1c1f] p-[2.6cqw] shadow-[0_40px_70px_-30px_rgba(0,0,0,0.5),inset_0_0_0_1px_rgba(255,255,255,0.08)] ring-1 ring-black/20">
      <div className="@container overflow-hidden rounded-[12.5%/5.8%] aspect-[390/844] flex flex-col bg-[#f4f4f1] dark:bg-[#0a0a0b]">
        <div
          className="relative shrink-0 aspect-[390/50] flex items-center justify-between px-[8%] text-[#0b0b0c] dark:text-[#ededef]"
          aria-hidden="true"
        >
          <span className="text-[3.9cqw] font-semibold tracking-tight">9:41</span>
          <span className="absolute left-1/2 -translate-x-1/2 top-[22%] h-[56%] w-[29%] rounded-full bg-black" />
          <span className="flex items-center gap-[1.2cqw]">
            <span className="flex items-end gap-[0.5cqw] h-[2.8cqw]">
              {[40, 60, 80, 100].map((h) => (
                <span key={h} className="w-[0.8cqw] rounded-[0.3cqw] bg-current" style={{ height: `${h}%` }} />
              ))}
            </span>
            <span className="relative w-[6.4cqw] h-[3cqw] rounded-[0.9cqw] border-[0.3cqw] border-current/40 p-[0.35cqw]">
              <span className="block h-full w-[78%] rounded-[0.4cqw] bg-current" />
            </span>
          </span>
        </div>
        <div className="relative shrink-0 aspect-[390/770]">
          <Shot src={`/screens/phone-${name}`} alt={alt} priority={priority} />
        </div>
        <div className="shrink-0 aspect-[390/24] flex items-center justify-center" aria-hidden="true">
          <span className="w-[34%] h-[1.3cqw] rounded-full bg-black/80 dark:bg-white/70" />
        </div>
      </div>
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
