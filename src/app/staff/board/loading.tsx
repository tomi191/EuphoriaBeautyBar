/** Брандови скелет за дъската: заглавие и хоризонтални колони с карти. */
export default function StaffBoardLoading() {
  return (
    <div className="min-h-screen bg-secondary/30 pb-20">
      <div className="mx-auto max-w-lg animate-pulse px-4 py-6">
        {/* Заглавен блок */}
        <div className="h-3 w-36 rounded-full bg-secondary" />
        <div className="mt-2 h-8 w-28 rounded-xl bg-cream" />
        <div className="mt-2 h-3 w-3/4 rounded-full bg-secondary/80" />

        {/* Колони по дни */}
        <div className="-mx-4 mt-5 overflow-hidden px-4 pb-4">
          <div className="flex gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex w-[72vw] max-w-[260px] shrink-0 flex-col rounded-2xl border border-border bg-background p-2.5 sm:w-60"
              >
                <div className="mb-2 px-1">
                  <div className="h-3 w-20 rounded-full bg-secondary" />
                  <div className="mt-1.5 h-2.5 w-14 rounded-full bg-secondary/70" />
                </div>
                <div className="flex flex-col gap-2">
                  {Array.from({ length: i === 0 ? 3 : 2 }).map((_, j) => (
                    <div key={j} className="rounded-xl border border-border bg-cream/60 p-2.5">
                      <div className="h-3.5 w-12 rounded-full bg-secondary" />
                      <div className="mt-2 h-3 w-3/4 rounded-full bg-secondary/80" />
                      <div className="mt-1.5 h-2.5 w-1/2 rounded-full bg-secondary/60" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
