# Редакция на час (Feature C) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Пълна редакция на съществуващ час (услуга, клиент+телефон, час, времетраене, бележка) в staff PWA и admin.

**Architecture:** Нови server actions `editMyBooking` (staff, own-resource guard) и `updateBooking` (admin), споделящи извлечен `upsertClientByPhone` хелпер. Форма за редакция: Sheet в PWA (`/staff`) + диалог в admin (`/admin/bookings`). Телефон: ръчно + Contact Picker API на Android. Застъпване (`bookings_no_overlap`) се лови меко.

**Tech Stack:** Next.js 16 App Router, Drizzle/Postgres (Supabase), React 19, zod, sonner. Без тест-харнес — верификация = `npm run build` + жива Playwright проверка (admin login). Самият Contact Picker на реално Android устройство го потвърждава потребителят.

**Spec:** `docs/superpowers/specs/2026-06-11-booking-edit-design.md`

---

## Task 1: Извлечи `upsertClientByPhone` в споделен хелпер

**Files:**
- Create: `src/lib/booking/clients.ts`
- Modify: `src/lib/actions/staff-bookings.ts` (преизползва хелпера в createMyBooking)

- [ ] **Step 1: Създай хелпера**

`src/lib/booking/clients.ts`:

```ts
import { nanoid } from "nanoid";
import { db, schema } from "@/lib/db";

/**
 * Връща clientId по телефон: ако има клиент с този номер → неговия id (обновява
 * името ако е подадено ново); иначе създава нов. Празен телефон → null (часът
 * остава без клиент).
 */
export async function upsertClientByPhone(name: string | undefined, phone: string | undefined): Promise<string | null> {
  const tel = (phone ?? "").trim();
  if (tel.length < 5) return null;
  const nm = (name ?? "").trim() || "Клиент";
  const existing = await db.query.clients.findFirst({ where: (c, { eq }) => eq(c.phone, tel) });
  if (existing) {
    if (nm && nm !== existing.name) {
      await db.update(schema.clients).set({ name: nm }).where(eq(schema.clients.id, existing.id));
    }
    return existing.id;
  }
  const id = nanoid();
  await db.insert(schema.clients).values({ id, name: nm, phone: tel, createdAt: new Date() });
  return id;
}
```

Добави `import { eq } from "drizzle-orm";` в clients.ts.

- [ ] **Step 2: Преизползвай в createMyBooking**

В `src/lib/actions/staff-bookings.ts` замени inline upsert блока (редове ~62-70, „upsert клиент по телефон") с:

```ts
import { upsertClientByPhone } from "@/lib/booking/clients";
// ...
const clientId = (await upsertClientByPhone(d.clientName, d.clientPhone)) ?? "";
```

Запази поведението: createMyBooking изисква телефон (схемата го валидира min(5)), така че clientId ще е реален. (Ако върне null, остави текущата валидация да го предотврати.)

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: ✓ зелено.

- [ ] **Step 4: Commit**

```bash
git add src/lib/booking/clients.ts src/lib/actions/staff-bookings.ts
git commit -m "Booking edit: shared upsertClientByPhone helper"
```

---

## Task 2: `editMyBooking` (staff)

**Files:**
- Modify: `src/lib/actions/staff-bookings.ts`

- [ ] **Step 1: Добави editMyBooking**

В `src/lib/actions/staff-bookings.ts` (ползва вече наличните `ownOffering`, `sofiaWallToUtc`, `hasTimeOffConflict`, `upsertClientByPhone`):

```ts
const editSchema = z.object({
  serviceItemId: z.string().nullable().optional(),
  serviceName: z.string().min(1),
  clientName: z.string().optional(),
  clientPhone: z.string().optional(),
  dateStr: z.string(),   // „YYYY-MM-DD" Sofia wall
  timeStr: z.string(),   // „HH:MM" Sofia wall
  durationMin: z.coerce.number().int().min(5).max(600),
  notes: z.string().nullable().optional(),
});

/** Изпълнителят редактира свой час: услуга, клиент, час, времетраене, бележка. */
export async function editMyBooking(id: string, input: z.infer<typeof editSchema>) {
  const { resource } = await requireStaff();
  const d = editSchema.parse(input);

  const booking = await db.query.bookings.findFirst({
    where: (b, { and, eq }) => and(eq(b.id, id), eq(b.resourceId, resource.id)),
  });
  if (!booking) return { ok: false as const, error: "Часът не е намерен или не е твой." };

  const start = sofiaWallToUtc(d.dateStr, d.timeStr);
  const end = new Date(start.getTime() + d.durationMin * 60000);

  if (await hasTimeOffConflict(resource.id, start, end)) {
    return { ok: false as const, error: "Имаш отпуск/почивка в този период." };
  }

  const clientId = await upsertClientByPhone(d.clientName, d.clientPhone);
  const priceEur = d.serviceItemId ? (await ownOffering(resource.id, d.serviceItemId)).priceEur : booking.priceEur;

  try {
    await db
      .update(schema.bookings)
      .set({
        serviceItemId: d.serviceItemId ?? null,
        serviceName: d.serviceName,
        clientId: clientId ?? booking.clientId,
        startAt: start,
        endAt: end,
        priceEur,
        notes: d.notes ?? null,
        updatedAt: new Date(),
      })
      .where(and(eq(schema.bookings.id, id), eq(schema.bookings.resourceId, resource.id)));
    revalidatePath("/staff");
    revalidatePath("/staff/board");
    revalidatePath("/admin/bookings");
    return { ok: true as const };
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (e?.code === "23P01" || (e?.message ?? "").includes("bookings_no_overlap")) {
      return { ok: false as const, error: "Застъпва друг час. Избери друго време." };
    }
    throw err;
  }
}
```

Бележка: `clientId ?? booking.clientId` — ако телефон не е въведен, запазва текущия клиент (ако има).

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: ✓ зелено.

- [ ] **Step 3: Commit**

```bash
git add src/lib/actions/staff-bookings.ts
git commit -m "Booking edit: editMyBooking (staff, own-resource guard)"
```

---

## Task 3: `updateBooking` (admin)

**Files:**
- Modify: `src/lib/actions/bookings.ts`

- [ ] **Step 1: Добави updateBooking**

В `src/lib/actions/bookings.ts` (виж как createBooking чете услуга/цена и пази overlap; огледай неговия pattern за durationMin/priceEur — ползвай serviceItems за каталожните стойности). Логиката е като editMyBooking, но с `requireAdmin()` и без resource guard (часът пази своя resourceId):

```ts
import { upsertClientByPhone } from "@/lib/booking/clients";
import { sofiaWallToUtc } from "@/lib/booking/time";

const updateSchema = z.object({
  serviceItemId: z.string().nullable().optional(),
  serviceName: z.string().min(1),
  clientName: z.string().optional(),
  clientPhone: z.string().optional(),
  dateStr: z.string(),
  timeStr: z.string(),
  durationMin: z.coerce.number().int().min(5).max(600),
  notes: z.string().nullable().optional(),
});

export async function updateBooking(id: string, input: z.infer<typeof updateSchema>) {
  await requireAdmin();
  const d = updateSchema.parse(input);

  const booking = await db.query.bookings.findFirst({ where: (b, { eq }) => eq(b.id, id) });
  if (!booking) return { ok: false as const, error: "Часът не е намерен." };

  const start = sofiaWallToUtc(d.dateStr, d.timeStr);
  const end = new Date(start.getTime() + d.durationMin * 60000);
  const clientId = await upsertClientByPhone(d.clientName, d.clientPhone);

  let priceEur = booking.priceEur;
  if (d.serviceItemId) {
    const item = await db.query.serviceItems.findFirst({ where: (s, { eq }) => eq(s.id, d.serviceItemId!) });
    priceEur = item?.price ?? booking.priceEur;
  }

  try {
    await db.update(schema.bookings).set({
      serviceItemId: d.serviceItemId ?? null,
      serviceName: d.serviceName,
      clientId: clientId ?? booking.clientId,
      startAt: start,
      endAt: end,
      priceEur,
      notes: d.notes ?? null,
      updatedAt: new Date(),
    }).where(eq(schema.bookings.id, id));
    revalidatePath("/admin/bookings");
    revalidatePath("/staff");
    return { ok: true as const };
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (e?.code === "23P01" || (e?.message ?? "").includes("bookings_no_overlap")) {
      return { ok: false as const, error: "Застъпва друг час." };
    }
    throw err;
  }
}
```

Увери се, че `requireAdmin`, `db`, `schema`, `eq`, `z`, `revalidatePath` са импортнати (createBooking вече ползва повечето).

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: ✓ зелено.

- [ ] **Step 3: Commit**

```bash
git add src/lib/actions/bookings.ts
git commit -m "Booking edit: updateBooking (admin)"
```

---

## Task 4: Contact Picker хелпер

**Files:**
- Create: `src/lib/contact-picker.ts`

- [ ] **Step 1: Създай хелпера**

`src/lib/contact-picker.ts`:

```ts
/** Contact Picker API — поддържа се на Android Chrome (secure context), не на iOS Safari. */
export function contactPickerSupported(): boolean {
  return typeof navigator !== "undefined" && "contacts" in navigator && "ContactsManager" in window;
}

interface PickedContact {
  name: string;
  phone: string;
}

/** Отваря системния избор на контакт; връща име+телефон или null (отказ/неподдържан). */
export async function pickContact(): Promise<PickedContact | null> {
  if (!contactPickerSupported()) return null;
  try {
    // @ts-expect-error - navigator.contacts не е в стандартните TS типове
    const results = await navigator.contacts.select(["name", "tel"], { multiple: false });
    if (!results || results.length === 0) return null;
    const c = results[0] as { name?: string[]; tel?: string[] };
    return {
      name: (c.name && c.name[0]) || "",
      phone: (c.tel && c.tel[0]) || "",
    };
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: без грешки в contact-picker.ts.

- [ ] **Step 3: Commit**

```bash
git add src/lib/contact-picker.ts
git commit -m "Booking edit: contact picker helper (Android)"
```

---

## Task 5: PWA — `BookingEditSheet` + закачане в графика

**Files:**
- Create: `src/components/staff/booking-edit-sheet.tsx`
- Modify: `src/app/staff/page.tsx`

- [ ] **Step 1: Създай BookingEditSheet**

`src/components/staff/booking-edit-sheet.tsx` (`"use client"`). Props: `{ booking: { id, serviceItemId, serviceName, clientName, clientPhone, dateStr, timeStr, durationMin, notes }, services: { id, name, durationMin, category }[], trigger: React.ReactNode }`. Sheet (от `@/components/ui/sheet`) с полета:
- Услуга: `<Select>` от `services` (групирани/плоско); избор сетва serviceName + durationMin (default).
- Клиент-име: `<Input>`.
- Телефон: `<Input>` + ако `contactPickerSupported()` → бутон „Избери от контакти" който вика `pickContact()` и попълва име+телефон.
- Дата: `<Input type="date">`; Час: `<Input type="time">`; Времетраене: `<Input type="number">` (минути).
- Бележка: `<Textarea>`.
- Бутон „Запази" → `editMyBooking(booking.id, {...})`; при `ok` → toast success + `router.refresh()` + затвори; иначе toast.error(res.error).
Всички полета с `htmlFor`/`id` (a11y, както поправихме в одит №5).

- [ ] **Step 2: Закачи в графика**

В `src/app/staff/page.tsx`, за всеки booking item в timeline-а, добави действие „Редактирай" (икона Pencil от lucide), което отваря `<BookingEditSheet>` с попълнени данни. Подай `services` (зареди ги в page-а от каталога/resource_services, както staff/new ги ползва) и прехвърли booking-овите полета (raw startAt → dateStr/timeStr през `sofiaDateStr`/`sofiaTimeLabel`; durationMin = (endAt-startAt)/60000). clientName/clientPhone от свързания client (зареди clientMap както /staff вече прави).

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: ✓ зелено.

- [ ] **Step 4: Commit**

```bash
git add src/components/staff/booking-edit-sheet.tsx src/app/staff/page.tsx
git commit -m "Booking edit: PWA edit sheet wired into schedule"
```

---

## Task 6: Admin — диалог за редакция в таблицата

**Files:**
- Create: `src/components/admin/booking-edit-dialog.tsx`
- Modify: `src/components/admin/booking-row-actions.tsx`
- Modify: `src/app/admin/(dashboard)/bookings/page.tsx`

- [ ] **Step 1: Създай BookingEditDialog**

`src/components/admin/booking-edit-dialog.tsx` (`"use client"`). Същите полета като PWA sheet-а (услуга Select, клиент-име, телефон + contact-picker бутон, дата, час, времетраене, бележка), но Dialog (от `@/components/ui/dialog`). Вика `updateBooking(id, {...})`. Props: booking данните + `services`.

- [ ] **Step 2: Добави „Редактирай" в реда**

В `src/components/admin/booking-row-actions.tsx` добави бутон „Редактирай" (Pencil), който отваря `<BookingEditDialog>`. Понеже row-actions сега приема само `{ id, status }`, разшири props-а да приема и booking полетата + `services` (подадени от страницата).

- [ ] **Step 3: Подай данните от страницата**

В `src/app/admin/(dashboard)/bookings/page.tsx` подай към всеки `BookingRowActions`: serviceItemId, serviceName, clientName/clientPhone (от clientMap), dateStr/timeStr (от startAt през sofia helpers), durationMin, notes + `services` (вече се строят в page-а за BookingForm).

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: ✓ зелено.

- [ ] **Step 5: Commit**

```bash
git add "src/components/admin/booking-edit-dialog.tsx" src/components/admin/booking-row-actions.tsx "src/app/admin/(dashboard)/bookings/page.tsx"
git commit -m "Booking edit: admin edit dialog in bookings table"
```

---

## Task 7: Push + жива верификация

- [ ] **Step 1: Финален build**

Run: `npm run build`
Expected: ✓ зелено, всички страници се компилират.

- [ ] **Step 2: Push**

```bash
git push
```

- [ ] **Step 3: Жива Playwright верификация (admin)**

Изчакай Vercel deploy (Playwright, НЕ curl). Логни се в /admin, отвори График на ден с импортнат чернови час (напр. 12 юни → Снежана), отвори „Редактирай":
- смени услугата от каталога → serviceName се обновява;
- въведи име + телефон → запази → редът показва клиента (вече не „—") в колоната Клиент;
- провери, че часът/времетраенето се обновяват;
- промяна към очевидно зает час → toast „Застъпва друг час", без срив.

- [ ] **Step 4: Отчет**

Резюме на изпълнението + бележка, че Contact Picker бутонът се проверява на реално Android устройство от потребителя.

---

## Дефиниция за готовност (spec §6)

- `next build` зелен.
- Редакция на импортнат час works end-to-end (услуга + клиент/телефон + час) в admin (Playwright).
- Застъпване → мек toast, без срив.
- Staff редактира само свои часове (resourceId guard).
- Contact Picker само където се поддържа; ръчно винаги.
