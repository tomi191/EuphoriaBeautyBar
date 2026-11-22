/** Статуси на бъдещ час, който още предстои (за изключен изпълнител: някой трябва да реши какво става с него). */
export const FUTURE_STATUSES = ["pending", "confirmed", "arrived"];

/** „Има 3 бъдещи часа при Мария" + „виж ги" (за админа след изключване). */
export function futureBookingsLabel(count: number, name: string): { text: string; see: string } {
  return count === 1
    ? { text: `Има 1 бъдещ час при ${name}`, see: "виж го" }
    : { text: `Има ${count} бъдещи часа при ${name}`, see: "виж ги" };
}
