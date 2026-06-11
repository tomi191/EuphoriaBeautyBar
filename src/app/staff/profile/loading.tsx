/** Скелет за профила: заглавие + карта с оборот + форма. */
export default function StaffProfileLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-3 w-24 rounded-full bg-secondary" />
      <div className="mt-2 h-8 w-32 rounded-xl bg-cream" />
      <div className="mt-5 h-24 w-full rounded-2xl bg-cream/60" />
      <div className="mt-5 space-y-3">
        <div className="h-11 w-full rounded-xl bg-secondary" />
        <div className="h-11 w-full rounded-xl bg-secondary" />
        <div className="h-24 w-full rounded-xl bg-secondary" />
      </div>
    </div>
  );
}
