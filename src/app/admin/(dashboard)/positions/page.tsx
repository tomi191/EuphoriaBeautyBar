import Link from "next/link";
import Image from "next/image";
import {
  CalendarDays,
  Check,
  Eye,
  Lock,
  Mail,
  MessageCircle,
  Plus,
  SquareArrowOutUpRight,
  TriangleAlert,
  UserRound,
} from "lucide-react";
import { loadRentalBoard, type BoardInquiry, type BoardListing, type BoardResource } from "@/lib/admin/rental-board";
import type { ListingStatus } from "@/lib/rental/listing-rules";
import { siteConfig } from "@/lib/site";
import { ListingActions } from "@/components/admin/rental-listing-actions";
import { InquiryActions } from "@/components/admin/rental-inquiry-actions";

/*
 * «Места под наем» (визия №19): раздели «Обяви» и «Запитвания». Състоянието на страницата е в
 * адреса (раздел, филтър, мястото, отвореният лист), затова камбанката и връзките водят точно там.
 */

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

const FILTERS: { key: "all" | ListingStatus; label: string }[] = [
  { key: "all", label: "Всички" },
  { key: "published", label: "Публикувани" },
  { key: "draft", label: "Чернови" },
  { key: "filled", label: "Заети" },
  { key: "paused", label: "Спрени" },
];

const STATUS: Record<ListingStatus, { label: string; pill: string; dot: string }> = {
  published: { label: "Публикувана", pill: "bg-mint-soft", dot: "bg-primary" },
  filled: { label: "Заето", pill: "bg-secondary", dot: "bg-foreground" },
  paused: { label: "Спряна", pill: "bg-secondary text-muted-foreground", dot: "bg-muted-foreground" },
  draft: { label: "Чернова", pill: "bg-secondary text-muted-foreground", dot: "border border-muted-foreground" },
};

const FALLBACK_IMAGE = "/images/interior/hero-bg.png";

function inquiriesWord(n: number) {
  return n === 1 ? "1 запитване" : `${n} запитвания`;
}

function href(params: Record<string, string | undefined>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
  const s = q.toString();
  return `/admin/positions${s ? `?${s}` : ""}`;
}

export default async function AdminRentalPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const tab = one(sp.tab) === "inquiries" ? "inquiries" : "listings";
  const { listings, resources, inquiries } = await loadRentalBoard();
  const newCount = inquiries.filter((i) => i.status === "new").length;

  return (
    <>
      <header className="mb-2 flex items-end justify-between gap-6 lg:mb-6">
        <div>
          <h1 className="font-display text-[2rem] font-medium leading-tight lg:text-[2.25rem]">Места под наем</h1>
          <p className="mt-1 hidden text-[1.0625rem] text-muted-foreground lg:block">
            Обявите за свободни места в салона и запитванията по тях.
          </p>
        </div>
        <NewListingButton className="hidden w-56 lg:inline-flex" />
      </header>

      <nav aria-label="Раздели" className="mb-5 flex border-b border-border lg:mb-6">
        <TabLink active={tab === "listings"} href={href({})}>
          Обяви
        </TabLink>
        <TabLink active={tab === "inquiries"} href={href({ tab: "inquiries" })}>
          Запитвания
          {newCount > 0 && (
            <span
              className="ml-2 grid size-6 place-items-center rounded-full bg-foreground text-[0.8125rem] font-medium text-background"
              aria-label={`${newCount} нови`}
            >
              {newCount}
            </span>
          )}
        </TabLink>
      </nav>

      {tab === "listings" ? (
        <ListingsTab sp={sp} listings={listings} resources={resources} />
      ) : (
        <InquiriesTab sp={sp} inquiries={inquiries} listings={listings} />
      )}
    </>
  );
}

function NewListingButton({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/admin/positions/new"
      className={
        "h-12 items-center justify-center gap-2 rounded-lg bg-foreground px-6 text-[1.0625rem] font-medium text-background hover:bg-foreground/90 " +
        className
      }
    >
      <Plus className="size-5" strokeWidth={1.8} /> Нова обява
    </Link>
  );
}

function TabLink({ active, href, children }: { active: boolean; href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={
        "-mb-px flex h-14 flex-1 items-center justify-center border-b-2 text-[1.125rem] lg:w-48 lg:flex-none " +
        (active ? "border-foreground font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")
      }
    >
      {children}
    </Link>
  );
}

/** Хапче за филтър: видимо 40 px, а мястото за докосване е 48 px. */
function Pill({ active, href, children }: { active: boolean; href: string; children: React.ReactNode }) {
  return (
    <Link href={href} aria-current={active ? "true" : undefined} className="flex h-12 shrink-0 items-center">
      <span
        className={
          "inline-flex h-10 items-center rounded-full px-4 text-[0.9375rem] lg:px-5 lg:text-base " +
          (active ? "bg-foreground text-background" : "border border-border bg-secondary text-foreground hover:bg-muted")
        }
      >
        {children}
      </span>
    </Link>
  );
}

/* ── Обяви ── */

function ListingsTab({ sp, listings, resources }: { sp: SP; listings: BoardListing[]; resources: BoardResource[] }) {
  const wanted = one(sp.status);
  const filterKey = FILTERS.find((f) => f.key === wanted)?.key ?? "all";
  const shown = filterKey === "all" ? listings : listings.filter((l) => l.status === filterKey);
  const openFill = one(sp.fill);
  const picked = one(sp.picked);
  const countOf = (k: "all" | ListingStatus) => (k === "all" ? listings.length : listings.filter((l) => l.status === k).length);

  if (listings.length === 0) {
    return (
      <EmptyState
        title="Още няма обяви"
        text="Когато в салона се освободи място, направи обява. Тя излиза на сайта в „Места под наем“."
        action={<NewListingButton className="inline-flex w-full max-w-sm" />}
      />
    );
  }

  return (
    <>
      <NewListingButton className="mb-3 flex w-full lg:hidden" />
      <ul className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:mb-6 lg:gap-3 lg:px-0" aria-label="Състояние">
        {FILTERS.map((f) => (
          <li key={f.key} className="shrink-0">
            <Pill active={filterKey === f.key} href={href({ status: f.key === "all" ? undefined : f.key })}>
              {f.label} {countOf(f.key)}
            </Pill>
          </li>
        ))}
      </ul>

      {shown.length === 0 ? (
        <p className="rounded-2xl border border-border px-6 py-12 text-center text-[1.0625rem] text-muted-foreground">
          Няма обяви в това състояние.
        </p>
      ) : (
        <>
          {/* Телефон: карти */}
          <ul className="space-y-4 lg:hidden">
            {shown.map((l) => (
              <li key={l.id} className="rounded-2xl border border-border p-4">
                <div className="flex gap-4">
                  <Thumb l={l} className="h-[8.5rem] w-[7.25rem]" />
                  <div className="min-w-0 flex-1">
                    <h2 className="font-display text-[1.3125rem] font-medium leading-tight">{l.place}</h2>
                    <StatusPill status={l.status} className="mt-2" />
                    <ul className="mt-3 space-y-2 text-base">
                      <Meta icon={CalendarDays}>{l.dateLabel}</Meta>
                      {l.status === "filled" && l.filledBy && (
                        <Meta icon={UserRound}>
                          <FilledByLink l={l} />
                        </Meta>
                      )}
                      <Meta icon={MessageCircle}>
                        <InquiriesLink l={l} />
                      </Meta>
                      <Meta icon={l.rentPublic ? Eye : Lock}>{l.rentPublic ? "Наемът се показва" : "Наемът не се показва"}</Meta>
                      {l.fbPostUrl && (
                        <Meta icon={SquareArrowOutUpRight}>
                          <FbPostLink url={l.fbPostUrl} />
                        </Meta>
                      )}
                      {l.status === "paused" && l.filledBy && (
                        <Meta icon={UserRound}>
                          <span className="text-muted-foreground">Беше заето от {l.filledBy.firstName}</span>
                        </Meta>
                      )}
                    </ul>
                  </div>
                </div>
                <ListingActions
                  className="mt-4"
                  layout="card"
                  listing={{ id: l.id, place: l.place, status: l.status, shareUrl: shareUrl(l), fbPostUrl: l.fbPostUrl }}
                  resources={resources}
                  openFill={openFill === l.id}
                  picked={openFill === l.id ? picked : undefined}
                />
              </li>
            ))}
          </ul>

          {/* Компютър: таблица */}
          <div className="hidden overflow-hidden rounded-2xl border border-border lg:block">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border text-base">
                  <th className="w-[34%] px-5 py-5 font-normal">Място</th>
                  <th className="border-l border-border px-4 py-5 font-normal">Състояние</th>
                  <th className="border-l border-border px-4 py-5 font-normal">Запитвания</th>
                  <th className="border-l border-border px-4 py-5 font-normal">Facebook</th>
                  <th className="w-[19%] border-l border-border px-4 py-5 font-normal">Действия</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((l) => (
                  <tr key={l.id} className="border-b border-border align-middle last:border-b-0">
                    <td className="px-5 py-5">
                      <div className="flex items-center gap-4">
                        <Thumb l={l} className="h-[7.5rem] w-28" />
                        <div className="min-w-0">
                          <div className="font-display text-[1.375rem] font-medium leading-tight">{l.place}</div>
                          <div className="mt-2 text-[1.0625rem] text-muted-foreground">{l.dateLabel}</div>
                          <div className="mt-3 flex items-center gap-2 text-[0.9375rem]">
                            {l.rentPublic ? <Eye className="size-4" strokeWidth={1.8} aria-hidden /> : <Lock className="size-4" strokeWidth={1.8} aria-hidden />}
                            {l.rentPublic ? "Наемът се показва" : "Наемът не се показва"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="border-l border-border px-4 py-5">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <StatusPill status={l.status} />
                        {l.status === "filled" && l.filledBy && (
                          <span className="text-[0.9375rem]">
                            от{" "}
                            <Link
                              href={`/admin/resources#r-${l.filledBy.id}`}
                              className={linkCls}
                              aria-label={`Заето от ${l.filledBy.firstName}: към изпълнителя и входа за личния график`}
                            >
                              {l.filledBy.firstName}
                            </Link>
                          </span>
                        )}
                      </div>
                      {l.status === "paused" && l.filledBy && (
                        <div className="mt-2 text-[0.9375rem] text-muted-foreground">Беше заето от {l.filledBy.firstName}</div>
                      )}
                    </td>
                    <td className="border-l border-border px-4 py-5 text-[1.0625rem]">
                      <InquiriesLink l={l} />
                    </td>
                    <td className="border-l border-border px-4 py-5">
                      <ListingActions
                        layout="facebook"
                        listing={{ id: l.id, place: l.place, status: l.status, shareUrl: shareUrl(l), fbPostUrl: l.fbPostUrl }}
                        resources={resources}
                      />
                    </td>
                    <td className="border-l border-border px-4 py-5">
                      <ListingActions
                        layout="table"
                        listing={{ id: l.id, place: l.place, status: l.status, shareUrl: shareUrl(l), fbPostUrl: l.fbPostUrl }}
                        resources={resources}
                        openFill={openFill === l.id}
                        picked={openFill === l.id ? picked : undefined}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

function shareUrl(l: BoardListing) {
  return l.status === "published" && l.slug ? `${siteConfig.url}/karieri/${l.slug}` : null;
}

function Thumb({ l, className }: { l: BoardListing; className: string }) {
  return (
    <div className={"relative shrink-0 overflow-hidden rounded-xl bg-secondary " + className}>
      <Image src={l.image ?? FALLBACK_IMAGE} alt={`Работното място: ${l.place}`} fill sizes="120px" className="object-cover" />
      {!l.image && (
        <span className="absolute inset-x-0 bottom-0 bg-foreground/70 px-2 py-1 text-center text-[0.8125rem] text-background">
          Чака снимка
        </span>
      )}
    </div>
  );
}

function StatusPill({ status, className = "" }: { status: ListingStatus; className?: string }) {
  const s = STATUS[status];
  return (
    <span className={`inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-base ${s.pill} ${className}`}>
      <span className={`size-2.5 rounded-full ${s.dot}`} aria-hidden />
      {s.label}
    </span>
  );
}

function Meta({ icon: Icon, children }: { icon: typeof Eye; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3">
      <Icon className="size-5 shrink-0" strokeWidth={1.6} aria-hidden />
      <span className="min-w-0">{children}</span>
    </li>
  );
}

const linkCls = "underline decoration-primary/60 decoration-2 underline-offset-[6px] hover:decoration-primary";

function InquiriesLink({ l }: { l: BoardListing }) {
  if (l.inquiries === 0) return <span className="text-muted-foreground">0 запитвания</span>;
  return (
    <Link href={href({ tab: "inquiries", place: l.id })} className={linkCls}>
      {inquiriesWord(l.inquiries)}
    </Link>
  );
}

function FilledByLink({ l }: { l: BoardListing }) {
  return (
    <Link
      href={`/admin/resources#r-${l.filledBy!.id}`}
      className={linkCls}
      aria-label={`Заето от ${l.filledBy!.firstName}: към изпълнителя и входа за личния график`}
    >
      Заето от {l.filledBy!.firstName}
    </Link>
  );
}

function FbPostLink({ url }: { url: string }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={linkCls}>
      Излезе във Facebook
    </a>
  );
}

function EmptyState({ title, text, action }: { title: string; text: string; action: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-2 py-12 text-center lg:py-20">
      <Mail className="size-16" strokeWidth={1.4} aria-hidden />
      <h2 className="mt-6 font-display text-[1.5rem] font-medium">{title}</h2>
      <p className="mt-3 text-[1.0625rem] leading-relaxed text-muted-foreground">{text}</p>
      <div className="mt-8 flex w-full justify-center">{action}</div>
    </div>
  );
}

/* ── Запитвания ── */

function InquiriesTab({ sp, inquiries, listings }: { sp: SP; inquiries: BoardInquiry[]; listings: BoardListing[] }) {
  const place = one(sp.place);
  const placeListing = place ? listings.find((l) => l.id === place) : undefined;
  const scoped = placeListing ? inquiries.filter((i) => i.positionId === placeListing.id) : inquiries;
  const view = one(sp.inq) === "handled" ? "handled" : "new";
  const shown = scoped.filter((i) => i.status === view);
  const nNew = scoped.filter((i) => i.status === "new").length;
  const nHandled = scoped.length - nNew;
  const undelivered = scoped.filter((i) => i.status === "new" && i.undelivered).length;
  const base = { tab: "inquiries", place: placeListing?.id };

  return (
    <>
      {placeListing && (
        <p className="mb-3 flex flex-wrap items-center gap-x-3 text-[1.0625rem]">
          <span>
            Само за място <span className="font-medium">{placeListing.place}</span>
          </span>
          <Link href={href({ tab: "inquiries", inq: view === "handled" ? "handled" : undefined })} className={linkCls}>
            Покажи всички
          </Link>
        </p>
      )}

      {undelivered > 0 && (
        <div role="alert" className="mb-4 flex gap-3 rounded-xl border border-blush bg-blush/30 p-4 text-[1.0625rem]">
          <TriangleAlert className="mt-0.5 size-5 shrink-0" strokeWidth={1.8} aria-hidden />
          <p>
            {undelivered === 1 ? "1 запитване не стигна" : `${undelivered} запитвания не стигнаха`} до телефона ти: Telegram не е
            свързан или не отговори. Виждаш {undelivered === 1 ? "го" : "ги"} само тук.{" "}
            <Link href="/admin/settings" className="font-medium underline underline-offset-4">
              Свържи Telegram
            </Link>
          </p>
        </div>
      )}

      <div className="mb-4 flex gap-2 lg:mb-6 lg:gap-3">
        <Pill active={view === "new"} href={href(base)}>
          Нови {nNew}
        </Pill>
        <Pill active={view === "handled"} href={href({ ...base, inq: "handled" })}>
          Обработени {nHandled}
        </Pill>
      </div>

      {shown.length === 0 ? (
        scoped.length === 0 ? (
          <EmptyState
            title="Още няма запитвания"
            text="Когато някой попълни формата в обявата, ще го видиш тук."
            action={
              <Link
                href={href({})}
                className="inline-flex h-12 w-full max-w-sm items-center justify-center rounded-lg border border-border px-6 text-[1.0625rem] font-medium hover:bg-muted"
              >
                Към обявите
              </Link>
            }
          />
        ) : (
          <p className="rounded-2xl border border-border px-6 py-12 text-center text-[1.0625rem] text-muted-foreground">
            {view === "new" ? "Няма нови запитвания." : "Още няма обработени запитвания."}
          </p>
        )
      ) : (
        <>
          <ul className="space-y-4 lg:hidden">
            {shown.map((i) => (
              <li key={i.id} className="rounded-2xl border border-border p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="font-display text-[1.375rem] font-medium leading-tight">{i.name}</h2>
                  <span className="shrink-0 text-[0.9375rem] text-muted-foreground">{i.whenLabel}</span>
                </div>
                <p className="mt-1 text-base text-muted-foreground">
                  {i.specialty ? `${i.specialty} · ` : ""}за {i.place}
                </p>
                {i.message && <p className="mt-3 font-serif text-[1.3125rem] italic leading-snug text-primary">{i.message}</p>}
                {i.handledLabel && i.status === "handled" && (
                  <p className="mt-3 flex items-center gap-2 text-[0.9375rem] text-primary">
                    <Check className="size-4" strokeWidth={2} aria-hidden /> {i.handledLabel}
                  </p>
                )}
                {i.undelivered && i.status === "new" && <Undelivered />}
                <InquiryActions className="mt-4" layout="card" inquiry={i} />
              </li>
            ))}
          </ul>

          <div className="hidden overflow-hidden rounded-2xl border border-border lg:block">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border text-base">
                  <th className="w-[15%] px-5 py-5 font-normal">Кой</th>
                  <th className="w-[15%] border-l border-border px-4 py-5 font-normal">Телефон</th>
                  <th className="border-l border-border px-4 py-5 font-normal">Какво пише</th>
                  <th className="w-[13%] border-l border-border px-4 py-5 font-normal">За място</th>
                  <th className="w-[12%] border-l border-border px-4 py-5 font-normal">Дошло</th>
                  <th className="w-[17%] border-l border-border px-4 py-5 font-normal">Действия</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((i) => (
                  <tr key={i.id} className="border-b border-border align-top last:border-b-0">
                    <td className="px-5 py-5">
                      <div className="font-display text-[1.375rem] font-medium leading-tight">{i.name}</div>
                      {i.specialty && <div className="mt-1 text-base text-muted-foreground">{i.specialty}</div>}
                    </td>
                    <td className="border-l border-border px-4 py-5">
                      <InquiryActions layout="phone" inquiry={i} />
                    </td>
                    <td className="border-l border-border px-4 py-5">
                      {i.message ? (
                        <p className="font-serif text-[1.3125rem] italic leading-snug text-primary">{i.message}</p>
                      ) : (
                        <span className="text-muted-foreground">Без съобщение.</span>
                      )}
                      {i.handledLabel && i.status === "handled" && (
                        <p className="mt-2 flex items-center gap-2 text-[0.9375rem] text-primary">
                          <Check className="size-4" strokeWidth={2} aria-hidden /> {i.handledLabel}
                        </p>
                      )}
                      {i.undelivered && i.status === "new" && <Undelivered />}
                    </td>
                    <td className="border-l border-border px-4 py-5 text-[1.0625rem]">{i.place}</td>
                    <td className="border-l border-border px-4 py-5 text-[1.0625rem] text-muted-foreground">{i.whenLabel}</td>
                    <td className="border-l border-border px-4 py-5">
                      <InquiryActions layout="table" inquiry={i} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

function Undelivered() {
  return (
    <p className="mt-3 flex items-center gap-2 text-[0.9375rem] text-foreground">
      <TriangleAlert className="size-4 shrink-0" strokeWidth={1.8} aria-hidden /> Известието не стигна до телефона ти.
    </p>
  );
}
