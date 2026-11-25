"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Popover } from "radix-ui";
import { Check, Loader2, Pause, Plus, Share2, SquareArrowOutUpRight } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { markListingFilled, pauseListing, reopenListing } from "@/lib/actions/rental-listings";
import type { ListingStatus } from "@/lib/rental/listing-rules";

/*
 * Действията за една обява в «Места под наем», според състоянието (визия №19):
 * публикувана → «Сподели във Facebook», «Редактирай», «Отбележи като заето», «Спри обявата»;
 * спряна → «Редактирай», «Пусни пак»; заета → «Отвори отново»; чернова → «Редактирай».
 * Всяко действие е server action с проверка за администратор на сървъра.
 */

export interface ActionListing {
  id: string;
  place: string;
  /** Видът изпълнител за мястото: в листа тези изпълнители са първи. */
  kind?: string | null;
  status: ListingStatus;
  /** Публичният адрес (само при публикувана): за «Сподели във Facebook». */
  shareUrl: string | null;
  fbPostUrl: string | null;
}

interface Props {
  listing: ActionListing;
  resources: { id: string; name: string; kind?: string; kindLabel: string }[];
  /** card: картата на телефон; table: колоната «Действия»; facebook: колоната «Facebook». */
  layout: "card" | "table" | "facebook";
  className?: string;
  /** Листът «Кой зае мястото?» се отваря сам (връщане от «Добави нов изпълнител»). */
  openFill?: boolean;
  picked?: string;
}

const DESKTOP = "(min-width: 1024px)";
const btn =
  "inline-flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-border bg-background px-3 text-[0.9375rem] font-medium hover:bg-muted disabled:opacity-60";
const btnTable =
  "inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-[0.9375rem] font-medium hover:bg-muted disabled:opacity-60";

function shareHref(url: string) {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}

export function ListingActions({ listing, resources, layout, className = "", openFill, picked }: Props) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<null | "pause" | "reopen">(null);

  async function run(kind: "pause" | "reopen") {
    setBusy(kind);
    try {
      const res = kind === "pause" ? await pauseListing(listing.id) : await reopenListing(listing.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(kind === "pause" ? "Обявата е спряна. Не се вижда на сайта." : "Обявата е пак на сайта.");
      router.refresh();
    } catch {
      toast.error("Не успях. Опитай пак.");
    } finally {
      setBusy(null);
    }
  }

  const s = listing.status;
  const share =
    s === "published" && listing.shareUrl && !listing.fbPostUrl ? (
      <a
        href={shareHref(listing.shareUrl)}
        target="_blank"
        rel="noopener noreferrer"
        className={layout === "card" ? btn : btnTable}
      >
        <Share2 className="size-5" strokeWidth={1.7} aria-hidden /> Сподели във Facebook
      </a>
    ) : null;

  if (layout === "facebook") {
    if (listing.fbPostUrl) {
      return (
        <a href={listing.fbPostUrl} target="_blank" rel="noopener noreferrer" className={btnTable}>
          <SquareArrowOutUpRight className="size-5" strokeWidth={1.7} aria-hidden /> Излезе във Facebook
        </a>
      );
    }
    return share ?? <span className="text-muted-foreground">Още не</span>;
  }

  const b = layout === "card" ? btn : btnTable;
  const edit = (
    <Link href={`/admin/positions/${listing.id}`} className={b}>
      Редактирай
    </Link>
  );
  const pause = (
    <button type="button" className={b} disabled={busy !== null} onClick={() => run("pause")}>
      {busy === "pause" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Pause className="size-5" strokeWidth={1.7} aria-hidden />}
      {layout === "card" ? "Спри обявата" : "Спри"}
    </button>
  );
  const reopen = (label: string) => (
    <button type="button" className={b} disabled={busy !== null} onClick={() => run("reopen")}>
      {busy === "reopen" && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {label}
    </button>
  );
  const fill = (
    <FillPicker
      listing={listing}
      resources={resources}
      desktop={layout === "table"}
      autoOpen={!!openFill}
      picked={picked}
      trigger={
        <button type="button" className={b}>
          Отбележи като заето
        </button>
      }
    />
  );

  if (layout === "table") {
    return (
      <div className={"flex flex-col gap-2 " + className}>
        {s === "published" && (
          <>
            {edit}
            {fill}
            {pause}
          </>
        )}
        {s === "paused" && (
          <>
            {edit}
            {reopen("Пусни пак")}
          </>
        )}
        {s === "filled" && reopen("Отвори отново")}
        {s === "draft" && edit}
      </div>
    );
  }

  return (
    <div className={"space-y-3 " + className}>
      {s === "published" && (
        <>
          {share}
          <div className="grid grid-cols-[2fr_3fr] gap-3">
            {edit}
            {fill}
          </div>
          {pause}
        </>
      )}
      {s === "paused" && (
        <div className="grid grid-cols-2 gap-3">
          {edit}
          {reopen("Пусни пак")}
        </div>
      )}
      {s === "filled" && reopen("Отвори отново")}
      {s === "draft" && edit}
    </div>
  );
}

/* ── «Кой зае мястото?»: долен лист на телефон, панел под бутона на компютър ── */

function FillPicker({
  listing,
  resources,
  desktop,
  autoOpen,
  picked,
  trigger,
}: {
  listing: ActionListing;
  resources: Props["resources"];
  desktop: boolean;
  autoOpen: boolean;
  picked?: string;
  trigger: React.ReactElement;
}) {
  const [open, setOpen] = React.useState(false);

  // Отваря се само в изгледа, който се вижда (картата и таблицата са в страницата и двете).
  React.useEffect(() => {
    if (autoOpen && window.matchMedia(DESKTOP).matches === desktop) setOpen(true);
  }, [autoOpen, desktop]);

  const body = <FillBody listing={listing} resources={resources} picked={picked} desktop={desktop} onDone={() => setOpen(false)} />;

  if (desktop) {
    return (
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>{trigger}</Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="end"
            sideOffset={8}
            collisionPadding={16}
            className="z-50 max-h-[var(--radix-popover-content-available-height)] w-[24rem] overflow-y-auto rounded-2xl border border-border bg-background px-6 pt-6 shadow-xl"
          >
            {body}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    );
  }

  return (
    <>
      <span className="contents" onClick={() => setOpen(true)}>
        {trigger}
      </span>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" showCloseButton={false} className="max-h-[90svh] gap-0 overflow-y-auto rounded-t-3xl px-5 pb-0 pt-3">
          <span className="mx-auto mb-5 block h-1.5 w-12 shrink-0 rounded-full bg-border" aria-hidden />
          {body}
        </SheetContent>
      </Sheet>
    </>
  );
}

function FillBody({
  listing,
  resources,
  picked,
  desktop,
  onDone,
}: {
  listing: ActionListing;
  resources: Props["resources"];
  picked?: string;
  desktop: boolean;
  onDone: () => void;
}) {
  const router = useRouter();
  const [choice, setChoice] = React.useState<string | null>(
    picked && resources.some((r) => r.id === picked) ? picked : null,
  );
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  // Изпълнителите от вида на мястото първи (маникюрист → «Маникюр»), другите след тях.
  const ordered = listing.kind
    ? [...resources.filter((r) => r.kind === listing.kind), ...resources.filter((r) => r.kind !== listing.kind)]
    : resources;
  const back = `/admin/positions?fill=${listing.id}`;
  const addHref = `/admin/resources?new=1&back=${encodeURIComponent(back)}`;
  const Title = desktop ? "h2" : SheetTitle;
  const Desc = desktop ? "p" : SheetDescription;

  async function save() {
    if (!choice) {
      setError("Избери кой зае мястото.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await markListingFilled(listing.id, choice);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      const who = resources.find((r) => r.id === choice)?.name.split(/\s+/)[0] ?? "";
      // При повече места обявата остава с едно място по-малко.
      toast.success(
        res.status === "filled"
          ? `Заето от ${who}. Обявата излезе от сайта.`
          : `Заето от ${who}. Обявата остава с ${res.seats > 1 ? `още ${res.seats} свободни места` : "още едно свободно място"}.`,
      );
      onDone();
      // Махаме ?fill и ?picked от адреса, за да не се отвори листът пак.
      router.replace("/admin/positions");
      router.refresh();
    } catch {
      setError("Не успях. Опитай пак.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <Title className="font-display text-[1.75rem] font-medium leading-tight text-foreground">Кой зае мястото?</Title>
      <Desc className="mt-1 text-[1.0625rem] text-muted-foreground">{listing.place}</Desc>

      <div role="radiogroup" aria-label="Специалист" className="mt-4">
        {resources.length === 0 && (
          <p className="border-b border-border py-4 text-base text-muted-foreground">Още няма изпълнители.</p>
        )}
        {ordered.map((r) => {
          const on = choice === r.id;
          return (
            <button
              key={r.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => {
                setChoice(r.id);
                setError(null);
              }}
              className="flex min-h-16 w-full items-center gap-4 border-b border-border py-3 text-left"
            >
              <span
                className={
                  "grid size-7 shrink-0 place-items-center rounded-full border-2 " +
                  (on ? "border-foreground bg-foreground text-background" : "border-foreground/70")
                }
                aria-hidden
              >
                {on && <Check className="size-4" strokeWidth={3} />}
              </span>
              <span>
                <span className="block text-[1.125rem] font-medium leading-snug">{r.name}</span>
                <span className="block text-base text-muted-foreground">{r.kindLabel}</span>
              </span>
            </button>
          );
        })}
        <Link href={addHref} className="flex h-14 items-center gap-4 text-[1.0625rem] font-medium">
          <Plus className="size-6" strokeWidth={1.6} aria-hidden /> Добави нов изпълнител
        </Link>
      </div>

      <p className="mt-3 text-[0.9375rem] text-muted-foreground">Обявата излиза от сайта. Можеш да я отвориш отново.</p>
      {/* Бутоните остават видими долу, когато изпълнителите са много и листът се превърта. */}
      <div className={"sticky bottom-0 mt-1 space-y-3 bg-background pb-6 pt-3 " + (desktop ? "-mx-6 px-6" : "-mx-5 px-5")}>
        {error && (
          <p role="alert" className="text-[0.9375rem] font-medium text-destructive">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-foreground px-6 text-[1.0625rem] font-medium text-background hover:bg-foreground/90 disabled:opacity-70"
        >
          {saving && <Loader2 className="size-4 animate-spin" aria-hidden />}
          Отбележи като заето
        </button>
        <button type="button" onClick={onDone} className={btn}>
          Отказ
        </button>
      </div>
    </div>
  );
}
