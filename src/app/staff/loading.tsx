/** Брандови скелет за графика: заглавие, ред с date pills и 3 timeline карти. */
export default function StaffScheduleLoading() {
  return (
    <div className="min-h-screen bg-secondary/30 pb-20">
      <div className="mx-auto max-w-lg animate-pulse px-4 py-6">
        {/* Заглавен блок */}
        <div className="h-3 w-44 rounded-full bg-secondary" />
        <div className="mt-2 h-8 w-36 rounded-xl bg-cream" />

        {/* Ред с date pills */}
        <div className="-mx-1 mt-5 flex gap-2 overflow-hidden px-1 pb-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-[62px] w-12 shrink-0 rounded-2xl bg-secondary" />
          ))}
        </div>

        {/* 3 timeline карти */}
        <div className="relative mt-6 pl-[52px]">
          <div className="absolute bottom-2 left-[44px] top-1 w-px bg-secondary" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="relative mb-3">
              <span className="absolute -left-[52px] top-0 h-3.5 w-11 rounded-full bg-secondary" />
              <span className="absolute -left-[10px] top-1.5 size-2.5 rounded-full bg-cream" />
              <div className="rounded-2xl border border-border bg-cream/60 p-3.5">
                <div className="h-4 w-2/3 rounded-full bg-secondary" />
                <div className="mt-2 h-3 w-1/2 rounded-full bg-secondary/80" />
                <div className="mt-3 h-3 w-2/5 rounded-full bg-secondary/60" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
