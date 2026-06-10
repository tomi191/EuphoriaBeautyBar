/** Брандови скелет за „Моите услуги": заглавие, табове, търсачка и списък редове. */
export default function StaffServicesLoading() {
  return (
    <div className="min-h-screen bg-secondary/30 pb-20">
      <div className="mx-auto max-w-lg animate-pulse px-4 py-6">
        {/* Заглавен блок */}
        <div className="h-3 w-28 rounded-full bg-secondary" />
        <div className="mt-2 h-8 w-44 rounded-xl bg-cream" />
        <div className="mt-2 h-3 w-2/3 rounded-full bg-secondary/80" />

        {/* Категорийни табове */}
        <div className="mt-5 flex gap-1.5 rounded-2xl bg-cream p-1.5">
          <div className="h-9 flex-1 rounded-xl bg-background/80" />
          <div className="h-9 flex-1 rounded-xl bg-cream" />
        </div>

        {/* Търсачка */}
        <div className="mt-4 h-11 rounded-xl bg-secondary" />

        {/* Списък редове */}
        <div className="mt-2 space-y-1.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-3">
              <div className="min-w-0 flex-1">
                <div className="h-3.5 w-2/3 rounded-full bg-secondary" />
                <div className="mt-2 h-2.5 w-1/3 rounded-full bg-secondary/70" />
              </div>
              <div className="h-5 w-9 shrink-0 rounded-full bg-cream" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
