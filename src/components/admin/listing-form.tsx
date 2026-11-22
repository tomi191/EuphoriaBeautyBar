"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Camera,
  Check,
  Droplet,
  Hand,
  ImageIcon,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  Scissors,
  Share2,
  Store,
  X,
} from "lucide-react";
import { prepareFile } from "@/components/admin/gallery-upload-form";
import {
  PREVIEW_MESSAGE,
  PREVIEW_READY,
} from "@/components/admin/listing-preview-frame";
import type { ListingViewData } from "@/components/rental/listing-view";
import {
  createListingDraft,
  publishListing,
  updateListing,
  uploadListingImage,
} from "@/lib/actions/rental-listings";
import type { FormCategory, FormListing } from "@/lib/admin/listing-form-data";
import { KIND_BY_SLUG } from "@/lib/booking/kind";
import type { FacebookPostResult } from "@/lib/facebook/page-post";
import {
  RENTAL_BENEFIT_KEYS,
  type RentalBenefitKey,
} from "@/lib/rental/benefits";
import { specialtyForCategory } from "@/lib/rental/inquiry-rules";
import { listingTitle, type ListingStatus } from "@/lib/rental/listing-rules";
import { cn } from "@/lib/utils";

/*
 * Формата «Нова обява» (визия №12 и №18): на телефон шест стъпки една след друга, на компютър
 * една страница с жив преглед вдясно. Всяка стъпка се пази в базата при «Към …», затова черновата
 * може да се продължи по-късно от адреса /admin/positions/<номер>.
 * Текстовете са на Саиф (обява-текстове, част 5; обява-запитване-и-наем, част 4).
 */

type Benefit = { key: string; left: string; right: string };

const STEP_NAMES = [
  "Място",
  "Услуги",
  "Предимства",
  "Снимка",
  "Наем",
  "Преглед",
] as const;
const STEP_QUESTIONS = [
  "Кое място е свободно?",
  "Какво ще работи?",
  "Какво получава при теб?",
  "Снимка на мястото",
  "Наем",
  "Така ще изглежда обявата",
] as const;
const STEP_HELP = [
  "Избери за кого е мястото: коса, нокти или козметика.",
  "Махни услугите, които не се правят тук. Заглавието се съставя само.",
  "Отметни какво получава специалистът. Показват се само отметнатите.",
  "Снимай мястото с телефона или избери снимка на салона. Тя е в обявата и в картата за споделяне.",
  "Запиши наема и уговорките. В обявата се вижда само ако включиш ключа.",
  null,
] as const;
const NEXT_LABELS = [
  "Към услугите",
  "Към предимствата",
  "Към снимката",
  "Към наема",
  "Към прегледа",
] as const;

const DEFAULT_BENEFITS = RENTAL_BENEFIT_KEYS.slice(0, 6) as string[];
const CUSTOM_MAX = 60;
const CUSTOM_LIMIT = 6;
const RENT_RE = /^(\d{1,6}([.,]\d{1,2})?)?$/;
const BAD_IMAGE =
  "Тази снимка не се отваря. Избери снимка във формат JPG, PNG или WebP.";
const SAVE_FAILED = "Не успях да запазя. Провери връзката и опитай пак.";

const KIND_ICON: Record<
  string,
  React.ComponentType<{ className?: string; strokeWidth?: number }>
> = {
  hair: Scissors,
  nails: Hand,
  cosmetics: Droplet,
};

interface Props {
  listing: FormListing | null;
  /** Стъпката, от която продължава (адрес ?step=2 след създаването на черновата). */
  initialStep?: number;
  categories: FormCategory[];
  benefits: Benefit[];
  siteUrl: string;
}

type Done = {
  facebook: FacebookPostResult | null;
  published: boolean;
  live: boolean;
};

export function ListingForm({
  listing,
  initialStep = 1,
  categories,
  benefits: catalog,
  siteUrl,
}: Props) {
  const router = useRouter();
  const [id, setId] = React.useState(listing?.id ?? null);
  const [status, setStatus] = React.useState<ListingStatus | null>(
    listing?.status ?? null,
  );
  const [slug, setSlug] = React.useState(listing?.slug ?? null);
  const [categoryId, setCategoryId] = React.useState(
    listing?.categoryId ?? null,
  );
  const [savedCategoryId, setSavedCategoryId] = React.useState(
    listing?.categoryId ?? null,
  );
  const [serviceIds, setServiceIds] = React.useState<string[]>(
    listing?.serviceIds ?? [],
  );
  const fresh =
    !listing ||
    (!listing.categoryId &&
      listing.benefits.length === 0 &&
      listing.customBenefits.length === 0);
  const [benefitKeys, setBenefitKeys] = React.useState<string[]>(
    fresh ? DEFAULT_BENEFITS : (listing?.benefits ?? []),
  );
  const [custom, setCustom] = React.useState<string[]>(
    listing?.customBenefits ?? [],
  );
  const [customDraft, setCustomDraft] = React.useState("");
  const [customError, setCustomError] = React.useState<string | null>(null);
  const [image, setImage] = React.useState(listing?.image ?? null);
  const [localImage, setLocalImage] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [imageError, setImageError] = React.useState<string | null>(null);
  const [rentText, setRentText] = React.useState(listing?.rentText ?? "");
  const [rentPublic, setRentPublic] = React.useState(
    listing?.rentPublic ?? false,
  );
  const [rentError, setRentError] = React.useState<string | null>(null);
  const [adminNote, setAdminNote] = React.useState(listing?.adminNote ?? "");
  const [step, setStep] = React.useState(initialStep);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState<Done | null>(null);
  const cameraRef = React.useRef<HTMLInputElement>(null);
  const galleryRef = React.useRef<HTMLInputElement>(null);

  const category = categories.find((c) => c.id === categoryId) ?? null;
  const title = category
    ? listingTitle(category.slug)
    : (listing?.title ?? "Място под наем");
  const isDraft = status === null || status === "draft";
  const heading = isDraft ? "Нова обява" : "Редакция на обявата";
  const finalLabel = isDraft ? "Публикувай обявата" : "Запази промените";

  const previewData: ListingViewData = {
    slug: slug ?? "preview",
    title,
    image: localImage ?? image,
    filled: status === "filled",
    benefits: catalog.filter((b) => benefitKeys.includes(b.key)),
    customBenefits: custom,
    rent: rentPublic && rentText.trim() ? rentText.trim() : null,
    specialty: specialtyForCategory(category?.slug),
  };

  function goTo(n: number) {
    setError(null);
    setStep(n);
    window.scrollTo({ top: 0 });
  }

  function chooseCategory(cat: FormCategory) {
    setError(null);
    if (cat.id !== categoryId) {
      setCategoryId(cat.id);
      setServiceIds(cat.services.map((s) => s.id));
    }
    // На компютър няма бутон «Към услугите»: мястото се пази веднага.
    if (window.matchMedia("(min-width: 1024px)").matches)
      void persistCategory(cat.id);
  }

  /** Пази избраното място: нова чернова или смяна на мястото на съществуващата обява. */
  async function persistCategory(
    catId: string | null = categoryId,
  ): Promise<boolean> {
    if (!catId) {
      setError("Избери място.");
      return false;
    }
    if (id && catId === savedCategoryId) return true;
    setBusy(true);
    setError(null);
    try {
      if (!id) {
        const res = await createListingDraft({ categoryId: catId });
        if (!res.ok) {
          setError(res.error);
          return false;
        }
        setId(res.id);
        setSlug(res.slug);
        setStatus("draft");
        setSavedCategoryId(catId);
        // Адресът става този на черновата (страницата се чете наново от базата, на телефон от стъпка 2):
        // опресняване или връщане по-късно я отваря пак.
        const desktop = window.matchMedia("(min-width: 1024px)").matches;
        router.replace(
          `/admin/positions/${res.id}${desktop ? "" : "?step=2"}`,
          { scroll: false },
        );
        return true;
      }
      const res = await updateListing(id, { categoryId: catId });
      if (!res.ok) {
        setError(res.error);
        return false;
      }
      setSlug(res.slug);
      setSavedCategoryId(catId);
      return true;
    } catch {
      setError(SAVE_FAILED);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function save(
    patch: Parameters<typeof updateListing>[1],
  ): Promise<boolean> {
    if (!id) {
      setError("Избери място.");
      return false;
    }
    setBusy(true);
    setError(null);
    setRentError(null);
    try {
      const res = await updateListing(id, patch);
      if (!res.ok) {
        if (res.error === "Въведи сума или изключи ключа.")
          setRentError(res.error);
        else setError(res.error);
        return false;
      }
      setSlug(res.slug);
      return true;
    } catch {
      setError(SAVE_FAILED);
      return false;
    } finally {
      setBusy(false);
    }
  }

  function rentPatch() {
    const rent = rentText.trim();
    if (!RENT_RE.test(rent)) {
      setRentError("Напиши сумата само с цифри, например 300.");
      return null;
    }
    return {
      rentText: rent || null,
      rentPublic,
      adminNote: adminNote.trim() || null,
    };
  }

  const benefitsPatch = () => ({
    benefits: RENTAL_BENEFIT_KEYS.filter((k) =>
      benefitKeys.includes(k),
    ) as RentalBenefitKey[],
    customBenefits: custom,
  });

  async function saveAll(): Promise<boolean> {
    if (!(await persistCategory())) return false;
    const rent = rentPatch();
    if (!rent) return false;
    return save({ serviceIds, ...benefitsPatch(), ...rent });
  }

  async function next() {
    if (busy) return;
    let ok = true;
    if (step === 1) ok = await persistCategory();
    else if (step === 2) ok = await save({ serviceIds });
    else if (step === 3) ok = await save(benefitsPatch());
    else if (step === 5) {
      const rent = rentPatch();
      ok = rent ? await save(rent) : false;
    }
    if (ok) goTo(step + 1);
  }

  async function finish() {
    if (busy) return;
    if (!(await saveAll())) return;
    if (!isDraft) {
      setDone({
        facebook: null,
        published: false,
        live: status === "published",
      });
      return;
    }
    setBusy(true);
    try {
      const res = await publishListing(id!);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setStatus("published");
      setDone({ facebook: res.facebook, published: true, live: true });
      window.scrollTo({ top: 0 });
    } catch {
      setError("Не успях да публикувам. Провери връзката и опитай пак.");
    } finally {
      setBusy(false);
    }
  }

  async function saveDraft() {
    if (busy) return;
    if (!(await saveAll())) return;
    toast.success("Черновата е запазена.");
    router.push("/admin/positions");
  }

  function back() {
    if (step > 1) goTo(step - 1);
    else router.push("/admin/positions");
  }

  function addCustom() {
    const text = customDraft.trim();
    if (!text) return;
    if (custom.length >= CUSTOM_LIMIT) {
      setCustomError(`Може до ${CUSTOM_LIMIT} свои реда.`);
      return;
    }
    setCustom([...custom, text.slice(0, CUSTOM_MAX)]);
    setCustomDraft("");
    setCustomError(null);
  }

  async function onFile(file: File | undefined) {
    setImageError(null);
    if (!file) return;
    if (!id) {
      setImageError("Първо избери място.");
      return;
    }
    if (file.type && !file.type.startsWith("image/")) {
      setImageError(BAD_IMAGE);
      return;
    }
    let prepared: Awaited<ReturnType<typeof prepareFile>>;
    try {
      // Смалява снимката в телефона и маха местоположението от нея.
      prepared = await prepareFile(file);
    } catch {
      setImageError(BAD_IMAGE);
      return;
    }
    setLocalImage(prepared.previewUrl);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", prepared.file);
      const res = await uploadListingImage(id, fd);
      if (!res.ok) {
        setImageError(res.error);
        setLocalImage(null);
        return;
      }
      setImage(res.url);
    } catch {
      setImageError("Снимката не се качи. Провери връзката и опитай пак.");
      setLocalImage(null);
    } finally {
      setUploading(false);
    }
  }

  if (done && slug) {
    return <DonePanel done={done} slug={slug} siteUrl={siteUrl} />;
  }

  const shownImage = localImage ?? image;
  const section = (n: number) =>
    cn(step === n ? "block" : "hidden", "lg:block");

  return (
    <div className="pb-28 lg:grid lg:grid-cols-[minmax(0,1fr)_30rem] lg:items-start lg:gap-8 lg:pb-0">
      <div className="min-w-0">
        {/* Телефон: назад, името на формата и докъде сме. */}
        <div className="lg:hidden">
          <div className="-ml-3 flex items-center gap-2">
            <button
              type="button"
              onClick={back}
              aria-label="Назад"
              className="grid size-12 place-items-center rounded-lg hover:bg-secondary"
            >
              <ArrowLeft className="size-6" strokeWidth={1.6} />
            </button>
            <p className="font-display text-xl font-medium">{heading}</p>
          </div>
          <div className="mt-3 flex items-center gap-4">
            <div
              className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary"
              aria-hidden
            >
              <div
                className="h-full rounded-full bg-mint transition-[width]"
                style={{ width: `${(step / 6) * 100}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {step} от 6 · {STEP_NAMES[step - 1]}
            </p>
          </div>
          <h1 className="mt-8 font-display text-[1.75rem] font-medium leading-tight">
            {STEP_QUESTIONS[step - 1]}
          </h1>
          {STEP_HELP[step - 1] && (
            <p className="mt-2 text-[0.95rem] text-muted-foreground">
              {STEP_HELP[step - 1]}
            </p>
          )}
        </div>

        {/* Компютър: една страница. */}
        <header className="hidden lg:block">
          <h1 className="font-display text-4xl font-medium">{heading}</h1>
          <p className="mt-2 text-muted-foreground">
            {isDraft
              ? "Обявата излиза на сайта, когато натиснеш „Публикувай обявата“."
              : "Промените излизат на сайта, когато натиснеш „Запази промените“."}
          </p>
        </header>

        {/* 1. Място */}
        <section
          className={cn(section(1), "mt-6 lg:mt-8")}
          aria-labelledby="step-place"
        >
          <h2
            id="step-place"
            className="sr-only font-display text-[1.375rem] font-medium lg:not-sr-only"
          >
            Място
          </h2>
          <div
            className="space-y-4 lg:mt-3 lg:flex lg:flex-wrap lg:gap-3 lg:space-y-0"
            role="radiogroup"
            aria-label="Място"
          >
            {categories.map((c) => {
              const Icon = KIND_ICON[KIND_BY_SLUG[c.slug] ?? ""] ?? Store;
              const selected = c.id === categoryId;
              return (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => chooseCategory(c)}
                  className={cn(
                    "flex min-h-[5.5rem] w-full items-center gap-6 rounded-lg border bg-background/60 px-6 text-left text-lg transition-colors hover:border-foreground/60 lg:min-h-12 lg:w-auto lg:min-w-44 lg:justify-center lg:gap-3 lg:px-5 lg:text-base",
                    selected
                      ? "border-2 border-foreground px-[23px] lg:px-[19px]"
                      : "border-border",
                  )}
                >
                  <Icon
                    className="size-10 shrink-0 lg:hidden"
                    strokeWidth={1.2}
                  />
                  <span className="flex-1 lg:flex-none">{c.title}</span>
                  {selected && (
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-foreground text-background lg:size-6">
                      <Check className="size-4" strokeWidth={2.5} />
                    </span>
                  )}
                </button>
              );
            })}
            {categories.length === 0 && (
              <p className="text-muted-foreground">
                В ценоразписа още няма услуги с онлайн записване.
              </p>
            )}
          </div>
        </section>

        {/* Стъпките след мястото: на компютър са изключени, докато мястото не е избрано и запазено. */}
        <fieldset
          disabled={!id}
          className={cn("min-w-0", !id && "lg:opacity-50")}
        >
          {/* 2. Услуги */}
          <section
            className={cn(section(2), "mt-6 lg:mt-8")}
            aria-labelledby="step-services"
          >
            <h2
              id="step-services"
              className="sr-only font-display text-[1.375rem] font-medium lg:not-sr-only"
            >
              Услуги
            </h2>
            {category ? (
              <>
                <p className="inline-flex rounded-lg bg-secondary px-4 py-2.5 text-[1.0625rem] lg:hidden">
                  {category.title}
                </p>
                <ul className="mt-4 lg:mt-2">
                  {category.services.map((s) => (
                    <li key={s.id}>
                      <CheckRow
                        checked={serviceIds.includes(s.id)}
                        onChange={(on) =>
                          setServiceIds(
                            on
                              ? category.services
                                  .filter(
                                    (x) =>
                                      x.id === s.id ||
                                      serviceIds.includes(x.id),
                                  )
                                  .map((x) => x.id)
                              : serviceIds.filter((x) => x !== s.id),
                          )
                        }
                      >
                        {s.name}
                      </CheckRow>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-2 text-muted-foreground">Първо избери място.</p>
            )}
          </section>

          {/* 3. Предимства */}
          <section
            className={cn(section(3), "mt-6 lg:mt-8")}
            aria-labelledby="step-benefits"
          >
            <h2
              id="step-benefits"
              className="sr-only font-display text-[1.375rem] font-medium lg:not-sr-only"
            >
              Предимства
            </h2>
            <ul className="lg:mt-2">
              {catalog.map((b) => (
                <li key={b.key}>
                  <CheckRow
                    checked={benefitKeys.includes(b.key)}
                    onChange={(on) =>
                      setBenefitKeys(
                        on
                          ? [...benefitKeys, b.key]
                          : benefitKeys.filter((k) => k !== b.key),
                      )
                    }
                  >
                    {b.left} {b.right}
                  </CheckRow>
                </li>
              ))}
              {custom.map((text, i) => (
                <li
                  key={`${i}-${text}`}
                  className="flex min-h-12 items-center gap-4 lg:min-h-10"
                >
                  <span
                    className="grid size-[22px] shrink-0 place-items-center rounded-[5px] bg-foreground text-background"
                    aria-hidden
                  >
                    <Check className="size-3.5" strokeWidth={3} />
                  </span>
                  <span className="flex-1 text-[1.0625rem] lg:text-lg">
                    {text}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCustom(custom.filter((_, j) => j !== i))}
                    aria-label={`Махни реда „${text}“`}
                    className="grid size-12 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    <X className="size-5" />
                  </button>
                </li>
              ))}
            </ul>
            <label htmlFor="custom-benefit" className="mt-4 block text-base">
              Добави свое
            </label>
            <div className="relative mt-2">
              <input
                id="custom-benefit"
                value={customDraft}
                maxLength={CUSTOM_MAX}
                onChange={(e) => setCustomDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustom();
                  }
                }}
                aria-describedby="custom-benefit-hint"
                className="h-12 w-full rounded-lg border border-border bg-background/60 pl-4 pr-14 text-base outline-none focus-visible:border-foreground focus-visible:ring-2 focus-visible:ring-ring/30"
              />
              <button
                type="button"
                onClick={addCustom}
                aria-label="Добави реда"
                className="absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-lg hover:bg-secondary"
              >
                <Plus className="size-6" strokeWidth={1.6} />
              </button>
            </div>
            <p
              id="custom-benefit-hint"
              className={cn(
                "mt-2 text-sm",
                customError ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {customError ??
                `До ${CUSTOM_MAX} знака. Излиза в обявата като отделен ред.`}
            </p>
          </section>

          {/* 4. Снимка */}
          <section
            className={cn(section(4), "mt-6 lg:mt-8")}
            aria-labelledby="step-photo"
          >
            <h2
              id="step-photo"
              className="sr-only font-display text-[1.375rem] font-medium lg:not-sr-only"
            >
              Снимка
            </h2>
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={(e) => {
                void onFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <input
              ref={galleryRef}
              type="file"
              accept="image/*"
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={(e) => {
                void onFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            {shownImage ? (
              <div className="lg:mt-3 lg:flex lg:items-center lg:gap-8">
                <p className="mb-2 text-base lg:sr-only">Преглед</p>
                <div className="relative overflow-hidden rounded-lg lg:w-72 lg:shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element -- снимката още не е в хранилището: локален преглед */}
                  <img
                    src={shownImage}
                    alt="Снимката на мястото"
                    className="aspect-[4/3] w-full object-cover"
                  />
                  {uploading && (
                    <div className="absolute inset-0 grid place-items-center bg-background/70 text-base">
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="size-5 animate-spin" /> Качвам
                        снимката…
                      </span>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => galleryRef.current?.click()}
                  disabled={uploading}
                  className="mt-4 inline-flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-border bg-background/60 px-6 text-base font-medium hover:border-foreground/60 disabled:opacity-60 lg:mt-0 lg:w-auto"
                >
                  <RefreshCw className="size-5" strokeWidth={1.6} /> Смени
                  снимката
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 lg:mt-3 lg:max-w-md">
                <PhotoTile
                  icon={Camera}
                  onClick={() => cameraRef.current?.click()}
                >
                  Снимай
                </PhotoTile>
                <PhotoTile
                  icon={ImageIcon}
                  onClick={() => galleryRef.current?.click()}
                >
                  Избери
                  <br />
                  от телефона
                </PhotoTile>
              </div>
            )}
            {imageError && (
              <p role="alert" className="mt-3 text-sm text-destructive">
                {imageError}
              </p>
            )}
          </section>

          {/* 5. Наем и бележката само за Снежана */}
          <section
            className={cn(section(5), "mt-6 lg:mt-8")}
            aria-labelledby="step-rent"
          >
            <h2
              id="step-rent"
              className="sr-only font-display text-[1.375rem] font-medium lg:not-sr-only"
            >
              Наем
            </h2>
            <p className="hidden text-sm text-muted-foreground lg:block">
              {STEP_HELP[4]}
            </p>
            <label
              htmlFor="rent"
              className="mt-2 block text-[1.0625rem] lg:mt-3 lg:text-base"
            >
              Наем{" "}
              <span className="ml-1 text-muted-foreground">(по желание)</span>
            </label>
            <div className="mt-2 lg:grid lg:grid-cols-2 lg:items-center lg:gap-6">
              <div className="relative">
                <input
                  id="rent"
                  inputMode="decimal"
                  autoComplete="off"
                  value={rentText}
                  placeholder="300"
                  maxLength={9}
                  onChange={(e) => {
                    setRentText(e.target.value);
                    setRentError(null);
                  }}
                  aria-invalid={rentError ? true : undefined}
                  aria-describedby="rent-switch-note"
                  className="h-12 w-full rounded-lg border border-border bg-background/60 pl-4 pr-32 text-base outline-none placeholder:text-muted-foreground/60 focus-visible:border-foreground focus-visible:ring-2 focus-visible:ring-ring/30 aria-[invalid]:border-destructive"
                />
                <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-base text-muted-foreground">
                  € на месец
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={rentPublic}
                onClick={() => {
                  setRentPublic(!rentPublic);
                  setRentError(null);
                }}
                className="mt-4 flex min-h-12 w-full items-center justify-between gap-4 text-left text-[1.0625rem] lg:mt-0 lg:text-base"
              >
                Показвай в обявата
                <span
                  className={cn(
                    "relative h-8 w-14 shrink-0 rounded-full transition-colors",
                    rentPublic ? "bg-foreground" : "bg-muted-foreground/25",
                  )}
                  aria-hidden
                >
                  <span
                    className={cn(
                      "absolute top-1 size-6 rounded-full bg-background shadow transition-[left]",
                      rentPublic ? "left-7" : "left-1",
                    )}
                  />
                </span>
              </button>
            </div>
            <p
              id="rent-switch-note"
              className="mt-1 text-sm text-muted-foreground lg:mt-2"
            >
              {rentPublic
                ? `Включено: в обявата пише „Наем · ${rentText.trim() || "…"} € на месец“.`
                : "Изключено: наемът не се вижда в обявата. Уговаряте го лично или по телефон."}
            </p>
            {rentError && (
              <p role="alert" className="mt-2 text-sm text-destructive">
                {rentError}
              </p>
            )}

            <div className="my-6 border-t border-border lg:hidden" />
            <h2 className="font-display text-2xl font-medium lg:mt-6 lg:text-[1.375rem]">
              <label htmlFor="admin-note">Бележка само за теб</label>
            </h2>
            <textarea
              id="admin-note"
              value={adminNote}
              maxLength={2000}
              rows={2}
              placeholder="За наема говорим на място."
              onChange={(e) => setAdminNote(e.target.value)}
              aria-describedby="admin-note-hint"
              className="mt-3 min-h-20 w-full rounded-lg border border-border bg-background/60 px-4 py-3 text-base outline-none placeholder:text-muted-foreground/60 focus-visible:border-foreground focus-visible:ring-2 focus-visible:ring-ring/30 lg:mt-2"
            />
            <p
              id="admin-note-hint"
              className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"
            >
              <Lock className="size-4 shrink-0" strokeWidth={1.8} /> Бележката
              не се показва в обявата.
            </p>
          </section>
        </fieldset>
      </div>

      {/* 6. Преглед: на телефон е стъпка, на компютър стои вдясно и се сменя с всяко поле. */}
      <aside
        className={cn(
          step === 6 ? "block" : "hidden",
          "mt-6 lg:sticky lg:top-8 lg:mt-0 lg:block",
        )}
        aria-label="Преглед на обявата"
      >
        <h2 className="hidden font-display text-[1.375rem] font-medium lg:block">
          Преглед
        </h2>
        <div className="rounded-[20px] border border-border bg-background lg:mt-3">
          <PreviewFrame
            data={previewData}
            className="h-[calc(100svh-22rem)] min-h-[22rem] rounded-t-[19px] lg:h-[calc(100svh-17rem)] lg:min-h-[30rem]"
          />
          <div className="hidden space-y-2 p-4 lg:block">
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <PrimaryButton onClick={finish} busy={busy}>
              {finalLabel}
            </PrimaryButton>
            {isDraft && (
              <button
                type="button"
                onClick={saveDraft}
                disabled={busy}
                className="h-12 w-full rounded-lg text-base font-medium hover:bg-secondary"
              >
                Запази като чернова
              </button>
            )}
          </div>
        </div>
        {isDraft && (
          <button
            type="button"
            onClick={saveDraft}
            disabled={busy}
            className="mt-2 h-12 w-full rounded-lg text-base font-medium hover:bg-secondary lg:hidden"
          >
            Запази като чернова
          </button>
        )}
      </aside>

      {/* Телефон: бутонът на стъпката, долу в зоната на палеца. */}
      <div className="fixed inset-x-0 bottom-0 z-30 bg-background px-4 pt-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))] lg:hidden">
        {error && (
          <p role="alert" className="mb-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <PrimaryButton
          onClick={step === 6 ? finish : next}
          busy={busy || (step === 4 && uploading)}
        >
          {step === 6 ? finalLabel : NEXT_LABELS[step - 1]}
        </PrimaryButton>
      </div>
    </div>
  );
}

function PrimaryButton({
  onClick,
  busy,
  children,
}: {
  onClick: () => void;
  busy: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-disabled={busy}
      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-foreground px-6 text-base font-medium text-background hover:bg-foreground/90 aria-disabled:opacity-70"
    >
      {busy && <Loader2 className="size-5 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

function CheckRow({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (on: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex min-h-12 cursor-pointer items-center gap-4 text-[1.0625rem] lg:min-h-10 lg:text-lg">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-[22px] shrink-0 cursor-pointer accent-foreground"
      />
      <span>{children}</span>
    </label>
  );
}

function PhotoTile({
  icon: Icon,
  onClick,
  children,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[7.5rem] flex-col items-center justify-center gap-2 rounded-lg border border-border bg-background/60 px-3 text-center text-[1.0625rem] leading-snug hover:border-foreground/60"
    >
      <Icon className="size-8" strokeWidth={1.4} />
      <span>{children}</span>
    </button>
  );
}

/** Прозорецът на прегледа: обявата в ширината на телефон (390), смалена или увеличена до кутията. */
function PreviewFrame({
  data,
  className,
}: {
  data: ListingViewData;
  className?: string;
}) {
  const boxRef = React.useRef<HTMLDivElement>(null);
  const frameRef = React.useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = React.useState(false);
  const [box, setBox] = React.useState({ w: 0, h: 0 });

  React.useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) =>
      setBox({ w: entry.contentRect.width, h: entry.contentRect.height }),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  React.useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (
        e.origin === window.location.origin &&
        e.source === frameRef.current?.contentWindow &&
        e.data?.type === PREVIEW_READY
      ) {
        setReady(true);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const json = JSON.stringify(data);
  React.useEffect(() => {
    if (ready)
      frameRef.current?.contentWindow?.postMessage(
        { type: PREVIEW_MESSAGE, data: JSON.parse(json) },
        window.location.origin,
      );
  }, [ready, json]);

  const scale = box.w > 0 ? box.w / 390 : 1;
  return (
    <div ref={boxRef} className={cn("relative overflow-hidden", className)}>
      <iframe
        ref={frameRef}
        src="/admin/listing-preview"
        title="Така ще изглежда обявата"
        tabIndex={-1}
        className="absolute left-0 top-0 border-0"
        style={{
          width: 390,
          height: box.h / scale || 0,
          transform: `scale(${scale})`,
          transformOrigin: "0 0",
        }}
      />
    </div>
  );
}

function DonePanel({
  done,
  slug,
  siteUrl,
}: {
  done: Done;
  slug: string;
  siteUrl: string;
}) {
  const url = `${siteUrl}/karieri/${slug}`;
  const shareHref = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  const fb = done.facebook;
  return (
    <div className="mx-auto flex max-w-md flex-col items-center pt-10 text-center lg:pt-16">
      <span className="grid size-32 place-items-center rounded-full border-[3px] border-primary/70 text-primary">
        <Check className="size-16" strokeWidth={1.6} />
      </span>
      <h1 className="mt-8 font-display text-[1.75rem] font-medium">
        {done.published ? "Обявата е публикувана" : "Промените са запазени"}
      </h1>
      {done.live && (
        <p className="mt-4 text-[1.0625rem]">
          Вижда се на сайта в „Места под наем“.
        </p>
      )}
      {fb && (
        <p className="mt-3 text-base text-muted-foreground" role="status">
          {fb.status === "posted" ? (
            <>
              Излезе във Facebook.{" "}
              <a
                href={fb.postUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground underline underline-offset-4"
              >
                Виж поста
              </a>
            </>
          ) : fb.status === "off" ? (
            "Facebook още не е свързан, затова постът не излезе сам. Сподели го с бутона."
          ) : fb.status === "token_invalid" ? (
            "Връзката с Facebook е изтекла, затова постът не излезе сам. Сподели го с бутона."
          ) : (
            "Facebook не прие поста. Сподели го с бутона."
          )}
        </p>
      )}
      <div className="mt-10 w-full space-y-3">
        <a
          href={shareHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-lg bg-foreground px-6 text-base font-medium text-background hover:bg-foreground/90"
        >
          <Share2 className="size-5" strokeWidth={1.8} /> Сподели във Facebook
        </a>
        {/* Пълно зареждане, не Link: шапката на сайта гърми при преход от администрацията (backlog). */}
        <a
          href={`/karieri/${slug}`}
          className="inline-flex h-12 w-full items-center justify-center rounded-lg border border-foreground px-6 text-base font-medium hover:bg-secondary"
        >
          Виж обявата
        </a>
      </div>
    </div>
  );
}
