export type BookingStatus = "confirmed" | "arrived" | "completed" | "cancelled" | "no_show";

type Target = "arrived" | "completed" | "cancelled" | "no_show";

/**
 * Позволени преходи на статус. completed/cancelled/no_show са терминални — иначе
 * двоен клик или остарял екран връщат отменен час в „приключен" (и в оборота).
 */
const ALLOWED_FROM: Record<Target, BookingStatus[]> = {
  arrived: ["confirmed"],
  // completed и от confirmed: на телефона майсторът често маркира „приключен" без „дошъл",
  // а settle cron-ът (api/cron/no-show) също прави confirmed → completed директно.
  completed: ["confirmed", "arrived"],
  cancelled: ["confirmed", "arrived"],
  no_show: ["confirmed"],
};

/** Статусите, от които е позволен преходът към `to` (за атомарен WHERE ... status IN (...)). */
export function allowedFrom(to: Target): BookingStatus[] {
  return ALLOWED_FROM[to];
}

export function canTransition(from: string, to: Target): boolean {
  return (ALLOWED_FROM[to] as string[]).includes(from);
}

export const TRANSITION_ERROR = "Часът не е намерен или статусът му не позволява тази промяна.";
