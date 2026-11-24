/** Скелетът на «Промоции»: заглавие, бутонът и редовете (без него се вижда скелетът на графика). */
export default function StaffPromotionsLoading() {
  return (
    <div className="min-h-screen bg-secondary/30 pb-20">
      <div className="mx-auto max-w-lg animate-pulse px-4 py-6">
        <div className="h-4 w-24 rounded-full bg-secondary" />
        <div className="mt-4 h-8 w-40 rounded-xl bg-cream" />
        <div className="mt-4 h-14 rounded-full bg-secondary" />
        <div className="mt-5 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 rounded-2xl border border-border bg-background px-4 py-4">
              <div className="min-w-0 flex-1">
                <div className="h-4 w-2/3 rounded-full bg-secondary" />
                <div className="mt-2.5 h-3 w-1/2 rounded-full bg-secondary/70" />
              </div>
              <div className="h-8 w-20 shrink-0 rounded-full bg-cream" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
