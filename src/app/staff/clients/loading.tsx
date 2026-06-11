/** Скелет за клиентското досие: заглавие + търсене + няколко реда клиенти. */
export default function StaffClientsLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-3 w-28 rounded-full bg-secondary" />
      <div className="mt-2 h-8 w-40 rounded-xl bg-cream" />
      <div className="mt-5 h-11 w-full rounded-xl bg-secondary" />
      <div className="mt-5 space-y-2.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-2xl border border-border bg-cream/60 p-3.5">
            <div className="size-10 shrink-0 rounded-full bg-secondary" />
            <div className="flex-1">
              <div className="h-4 w-2/5 rounded-full bg-secondary" />
              <div className="mt-2 h-3 w-1/3 rounded-full bg-secondary/70" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
