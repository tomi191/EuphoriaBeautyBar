"use server";

import { requireAdmin } from "@/lib/actions/auth-guard";
import { sendTestPushToAll } from "@/lib/push";

/**
 * Admin-only: праща тестово push известие във ФОРМАТА на нов запис до всички
 * абонирани устройства. Връща броячите (изпратени/изтекли/грешки/общо), за да ги
 * покаже бутонът. Така проверката минава по същия FCM път като реалните известия.
 */
export async function sendTestPush() {
  await requireAdmin();
  return sendTestPushToAll({
    title: "Нов запис (тест)",
    body: "Боядисване (средна коса) — днес 17:00 · Тестов клиент",
    url: "/staff",
  });
}
