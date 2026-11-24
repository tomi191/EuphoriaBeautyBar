"use client";

import * as React from "react";

/**
 * Страниците с промоции се опресняват на 10 минути; в 23:59 на последния ден промоцията трябва да изчезне веднага
 * (Саиф 1.10), дори кешираната страница да е от вчера. Сървърът показва само течащите; тук браузърът само скрива
 * свършилата.
 */
export function EndGate({ endsOn, children }: { endsOn: string; children: React.ReactNode }) {
  const [over, setOver] = React.useState(false);
  React.useEffect(() => {
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Sofia" }).format(new Date());
    if (today > endsOn) setOver(true);
  }, [endsOn]);
  return over ? null : <>{children}</>;
}
