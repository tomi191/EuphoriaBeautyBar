/** Етикети за канала на записване (bookings.source) + формат „кога е записан". */

export const SOURCE_LABEL: Record<string, string> = {
  online: "онлайн",
  phone: "телефон",
  walkin: "на място",
};

export function sourceLabel(source: string): string {
  return SOURCE_LABEL[source] ?? source;
}

const createdFmt = new Intl.DateTimeFormat("bg-BG", {
  timeZone: "Europe/Sofia",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** „13.07, 12:40" (Sofia) — кога е направен записът. */
export function createdAtLabel(createdAt: Date): string {
  return createdFmt.format(createdAt).replace(" г.,", ",");
}
