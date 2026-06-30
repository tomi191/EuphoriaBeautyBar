"use client";

import * as React from "react";
import { BellRing, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { sendTestPush } from "@/lib/actions/admin-push";

/**
 * Бутон в Настройки → праща тестов push до всички абонирани устройства и показва
 * резултата като toast. Различава трите изхода (няма абонати / нищо не мина / успех),
 * за да насочи къде е проблемът, ако известие не дойде на телефона.
 */
export function TestPushButton() {
  const [busy, setBusy] = React.useState(false);

  async function send() {
    setBusy(true);
    try {
      const r = await sendTestPush();
      if (r.total === 0) {
        toast.warning("Няма абонирани устройства. Отвори /staff на телефона и включи известията.");
      } else if (r.sent === 0) {
        toast.error(`Нито едно не мина (${r.expired} изтекли · ${r.failed} грешки). Провери VAPID ключовете.`);
      } else {
        toast.success(
          `Изпратено до ${r.sent} от ${r.total} устройства` +
            (r.expired ? ` · ${r.expired} изтекли почистени` : "") +
            ". Виж дали изскача на телефона.",
        );
      }
    } catch {
      toast.error("Грешка при изпращане. Опитай пак.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button onClick={send} disabled={busy} variant="outline" className="rounded-full">
      {busy ? <Loader2 className="size-4 animate-spin" /> : <BellRing className="size-4" />}
      Изпрати тестов push
    </Button>
  );
}
