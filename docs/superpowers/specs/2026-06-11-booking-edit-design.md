# Редакция на час (услуга + клиент/телефон) — дизайн

**Дата:** 2026-06-11
**Статус:** одобрен дизайн, чака implementation plan
**Контекст:** Функция C от разбивката на графика (A=блокиране на часове вече съществува в
/staff/hours; B=паралелен час при изчакване — отделен по-късен цикъл). След bulk-импорта на
хартиения график на Снежана (31 чернови часа: serviceName=„Име · услуга?", clientId=null,
serviceItemId=null, 15-мин placeholder) има нужда от ръчно полиране. Сега НИТО admin, НИТО PWA
имат „редактирай час" — само създаване, статуси, отказ; staff има само reschedule на часа.

---

## 1. Цел и обхват

Пълна редакция на съществуващ час в двете повърхности (staff PWA + admin):
- **услуга** (от каталога → serviceItemId + serviceName + времетраене/цена),
- **клиент** (име + телефон; ръчно или от контактите на телефона),
- **час и времетраене**,
- **бележка**.

Не-цели (YAGNI): промяна на изпълнителя на часа (рядко; може отделно); масова редакция;
B (паралелен/застъпващ час) — отделен цикъл.

---

## 2. Server actions

### 2a. Споделена логика — client upsert
Хелпер `upsertClientByPhone(name, phone)` (в `src/lib/booking/` или actions util):
- ако `phone` е празен → връща `null` (часът остава без клиент, clientId=null);
- иначе търси `clients` по нормализиран `phone`; ако има → връща неговия id (по избор update на name); иначе създава нов `clients` ред (name+phone) и връща id.

### 2b. Staff — `editMyBooking` (в `src/lib/actions/staff-bookings.ts`)
Подпис: `editMyBooking(id, { serviceItemId?: string | null, serviceName: string, clientName?: string, clientPhone?: string, startISO: string, durationMin: number, notes?: string })`.
- `requireStaff()`; зарежда часа с `and(eq(b.id,id), eq(b.resourceId, resource.id))` — редактира само свой час; иначе грешка.
- ако `serviceItemId` подаден → чете `service_items` за default времетраене/цена (но подадените стойности печелят).
- `clientId = await upsertClientByPhone(clientName, clientPhone)` (ако има телефон).
- `startAt = new Date(startISO)`, `endAt = startAt + durationMin*60000`.
- `update bookings set serviceItemId, serviceName, clientId, startAt, endAt, notes, updatedAt` where id+resourceId.
- try/catch: при `23P01`/`no_overlap` → `{ ok:false, error:"Застъпва друг час." }`. revalidate /staff, /admin/bookings.

### 2c. Admin — `updateBooking` (в `src/lib/actions/bookings.ts`)
Същият подпис без resource guard; `requireAdmin()`; редактира всеки час (по подаден resourceId не се мени изпълнителят — остава същият). Същата upsert + overlap логика.

---

## 3. UI — форма за редакция

Едно споделено съдържание на форма, използвано в двете повърхности. Полета:
- **Услуга** — Select от каталога (serviceItems по категории); избор попълва serviceName + времетраене.
- **Клиент — име** — текстово поле.
- **Телефон** — текстово поле + бутон **„Избери от контакти"** (само където `navigator.contacts`/
  `ContactsManager` се поддържат — Android Chrome; на iPhone бутонът не се рендира).
- **Дата + час** — date + time (Sofia wall time; конвертира се с `sofiaWallToUtc`).
- **Времетраене** — минути (по подразбиране от услугата).
- **Бележка** — textarea.

### 3a. PWA (staff)
- Нов компонент `src/components/staff/booking-edit-sheet.tsx` (`"use client"`, Sheet).
- Отваря се от графика (`/staff` timeline) — всеки час получава бутон/действие „Редактирай".
- При запис вика `editMyBooking`; toast при успех/грешка; `router.refresh()`.

### 3b. Admin
- В `/admin/bookings` всеки ред получава „Редактирай" (в `BookingRowActions` или нов бутон) →
  диалог с формата (попълнен). Вика `updateBooking`.
- Преизползва каталога на услугите, който страницата вече зарежда (`services`).

### 3c. Contact Picker хелпер
`src/lib/contact-picker.ts`: `pickContact()` — guard `typeof navigator!=="undefined" && "contacts" in navigator && "ContactsManager" in window`; `await navigator.contacts.select(["name","tel"], { multiple:false })`; връща `{ name, phone } | null`. Бутонът в UI се показва само ако `contactPickerSupported()`.

---

## 4. Поведение / ръбове

- **Overlap:** промяна на час/времетраене може да удари `bookings_no_overlap` → ловим грешката,
  спокоен toast „Застъпва друг час", без срив.
- **Празен телефон:** позволено — clientId остава null; редакцията на услуга/час пак минава.
- **Дубликат клиент:** upsert по телефон предотвратява дублиране на клиентски картони.
- **Scope:** staff редактира само свои часове (resourceId guard в editMyBooking); admin — всички.
- **Часова зона:** входът е Sofia wall time; `sofiaWallToUtc` за съхранение в UTC (както навсякъде).
- **Цена/оборот:** ако се избере услуга с цена, попълва priceEur (за оборота) — по избор, ако
  serviceItem носи цена; иначе остава null.

---

## 5. Файлове

| Файл | Действие |
|------|----------|
| `src/lib/booking/clients.ts` (или actions util) | НОВ — `upsertClientByPhone` |
| `src/lib/contact-picker.ts` | НОВ — `pickContact` + `contactPickerSupported` |
| `src/lib/actions/staff-bookings.ts` | + `editMyBooking` |
| `src/lib/actions/bookings.ts` | + `updateBooking` |
| `src/components/staff/booking-edit-sheet.tsx` | НОВ — PWA форма за редакция |
| `src/app/staff/page.tsx` | „Редактирай" на час в графика → отваря sheet |
| `src/components/admin/booking-row-actions.tsx` (или нов диалог) | + „Редактирай" в admin |
| `src/app/admin/(dashboard)/bookings/page.tsx` | подава нужните props (услуги) към edit |

---

## 6. Верификация (definition of done)

- `next build` зелен.
- Жива (Playwright, admin login): редакция на импортнат чернови час — смяна на услуга от каталога,
  въвеждане на име+телефон → часът показва клиента (вече не „—"), услугата и часа са обновени.
- Промяна към застъпващ се час → спокоен toast, без срив.
- Staff не може да редактира чужд час (resourceId guard).
- Contact Picker бутонът се появява само на поддържащо устройство; ръчното въвеждане работи
  навсякъде. (Самият contact-picker на реално Android устройство го потвърждава потребителят.)
