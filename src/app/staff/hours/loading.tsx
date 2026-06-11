/** Скелет за работното време: заглавие + 7 реда дни. */
export default function StaffHoursLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-3 w-28 rounded-full bg-secondary" />
      <div className="mt-2 h-8 w-36 rounded-xl bg-cream" />
      <div className="mt-5 space-y-2.5">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between rounded-2xl border border-border bg-cream/60 p-3.5">
            <div className="h-4 w-24 rounded-full bg-secondary" />
            <div className="h-7 w-28 rounded-lg bg-secondary/80" />
          </div>
        ))}
      </div>
    </div>
  );
}
