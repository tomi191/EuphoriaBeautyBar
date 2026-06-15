"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageCircle, Phone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getMyClientFile, saveMyClientNote, deleteMyClient, type ClientFileData } from "@/lib/actions/staff-clients";

const TZ = "Europe/Sofia";
const visitDateFmt = new Intl.DateTimeFormat("bg-BG", { timeZone: TZ, day: "numeric", month: "short", year: "numeric" });
const visitTimeFmt = new Intl.DateTimeFormat("bg-BG", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false });

const STATUS: Record<string, { label: string; cls: string }> = {
  confirmed: { label: "Потвърден", cls: "bg-mint/40 text-foreground" },
  arrived: { label: "Пристигна", cls: "bg-primary/20 text-foreground" },
  completed: { label: "Завършен", cls: "bg-secondary text-muted-foreground" },
  pending: { label: "Чакащ", cls: "bg-secondary text-muted-foreground" },
  no_show: { label: "Не дойде", cls: "bg-destructive/10 text-destructive" },
  cancelled: { label: "Отменен", cls: "bg-secondary text-muted-foreground line-through" },
};

// Изчиства телефона за tel:/viber: линкове - оставя само водещ + и цифри.
function dialNumber(phone: string) {
  const trimmed = phone.trim();
  const plus = trimmed.startsWith("+") ? "+" : "";
  return plus + trimmed.replace(/\D/g, "");
}

/** Bottom sheet с досието на клиент: лична бележка + история на посещенията при този изпълнител. */
export function ClientFileSheet({ clientId, onClose }: { clientId: string; onClose: () => void }) {
  const [data, setData] = React.useState<ClientFileData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [note, setNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [confirmDel, setConfirmDel] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const router = useRouter();

  // Lazy fetch при отваряне на sheet-а.
  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getMyClientFile(clientId)
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setNote(res?.note ?? "");
      })
      .catch(() => {
        if (!cancelled) toast.error("Грешка при зареждане на досието.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  async function save() {
    setSaving(true);
    try {
      await saveMyClientNote(clientId, note);
      // Леко хаптично потвърждение на успешното запазване.
      if (typeof navigator !== "undefined") navigator.vibrate?.(10);
      toast.success("Бележката е запазена.");
    } catch {
      toast.error("Грешка при запазване.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await deleteMyClient(clientId);
      if (res.ok) {
        toast.success("Контактът е изтрит.");
        router.refresh(); // списъкът се презарежда → клиентът изчезва
        onClose();
      } else {
        toast.error(res.error ?? "Грешка при изтриване.");
        setConfirmDel(false);
      }
    } catch {
      toast.error("Грешка при изтриване.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <button aria-label="Затвори" className="fixed inset-0 z-40 bg-foreground/35" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[85dvh] max-w-lg overflow-y-auto rounded-t-3xl border-t border-border bg-background p-4 pb-6 shadow-2xl">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : !data ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Клиентът не е намерен.</p>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-base font-bold leading-tight">{data.client.name}</h3>
                {data.client.phone && <p className="mt-0.5 text-sm text-muted-foreground">{data.client.phone}</p>}
              </div>
              {data.client.phone && (
                <span className="flex shrink-0 items-center gap-1.5">
                  <a
                    href={`tel:${dialNumber(data.client.phone)}`}
                    aria-label={`Обади се на ${data.client.name}`}
                    title="Обади се"
                    className="inline-flex size-9 items-center justify-center rounded-full bg-primary/15 text-primary transition-colors hover:bg-primary hover:text-background"
                  >
                    <Phone className="size-4" strokeWidth={2.2} />
                  </a>
                  <a
                    href={`viber://chat?number=${dialNumber(data.client.phone)}`}
                    aria-label={`Пиши във Viber на ${data.client.name}`}
                    title="Viber"
                    className="inline-flex size-9 items-center justify-center rounded-full bg-primary/15 text-primary transition-colors hover:bg-primary hover:text-background"
                  >
                    <MessageCircle className="size-4" strokeWidth={2.2} />
                  </a>
                </span>
              )}
            </div>

            <div className="mt-3 space-y-1.5">
              <Label htmlFor="client-note">Лична бележка</Label>
              <Textarea
                id="client-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Формула, предпочитания, алергии…"
                className="min-h-20 rounded-xl text-base"
              />
              <div className="flex justify-end">
                <Button
                  onClick={save}
                  disabled={saving}
                  size="sm"
                  className="h-9 rounded-full bg-foreground px-5 text-background hover:bg-primary"
                >
                  {saving ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" /> Запазване
                    </>
                  ) : (
                    "Запази"
                  )}
                </Button>
              </div>
            </div>

            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Посещения {data.visits.length > 0 ? `(${data.visits.length})` : ""}
              </p>
              {data.visits.length === 0 ? (
                <p className="rounded-xl border border-border bg-background px-3 py-4 text-center text-sm text-muted-foreground">
                  Няма записани посещения.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {data.visits.map((v) => {
                    const st = STATUS[v.status] ?? STATUS.pending;
                    const d = new Date(v.dateISO);
                    return (
                      <div key={v.id} className="rounded-xl border border-border bg-background px-3 py-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold leading-tight">{v.serviceName}</p>
                          <span className={"shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium " + st.cls}>{st.label}</span>
                        </div>
                        <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                          {visitDateFmt.format(d)} · {visitTimeFmt.format(d)}
                        </p>
                        {v.notes && <p className="mt-1 text-xs text-muted-foreground">{v.notes}</p>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-5 border-t border-border pt-3">
              {confirmDel ? (
                <div className="flex items-center justify-between gap-2 rounded-xl bg-destructive/5 px-3 py-2">
                  <span className="text-xs text-foreground/70">Изтриване на контакта и бележките?</span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deleting}
                      className="rounded-full bg-destructive px-3 py-1 text-xs font-semibold text-white"
                    >
                      {deleting ? <Loader2 className="size-3.5 animate-spin" /> : "Изтрий"}
                    </button>
                    {!deleting && (
                      <button type="button" onClick={() => setConfirmDel(false)} className="px-1 text-xs font-medium text-muted-foreground">
                        Отказ
                      </button>
                    )}
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDel(true)}
                  className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-destructive"
                >
                  <Trash2 className="size-3.5" /> Изтрий контакта
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}

/** Името на клиента като бутон, който отваря досието (за графика на работника). */
export function ClientFileTrigger({ clientId, name, className }: { clientId: string; name: string; className?: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {name}
      </button>
      {open && <ClientFileSheet clientId={clientId} onClose={() => setOpen(false)} />}
    </>
  );
}
