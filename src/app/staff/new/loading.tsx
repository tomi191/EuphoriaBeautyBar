/** Скелет за нов час: заглавие + секции услуга/дата/час/клиент. */
export default function StaffNewLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-3 w-24 rounded-full bg-secondary" />
      <div className="mt-2 h-8 w-32 rounded-xl bg-cream" />
      <div className="mt-6 space-y-5">
        <div className="h-11 w-full rounded-xl bg-secondary" />
        <div className="grid grid-cols-4 gap-1.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-10 rounded-xl bg-secondary/80" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="h-12 rounded-xl bg-secondary" />
          <div className="h-12 rounded-xl bg-secondary" />
        </div>
      </div>
    </div>
  );
}
