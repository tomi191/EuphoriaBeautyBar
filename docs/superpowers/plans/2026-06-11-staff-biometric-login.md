# Staff PWA биометричен вход (passkey) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Staff PWA да предлага вход с пръстов отпечатък/Face ID след първия вход с парола; паролата остава fallback.

**Architecture:** better-auth passkey плъгин (WebAuthn, platform authenticator). Сървърен плъгин в auth.ts + клиентски в auth-client.ts + `passkey` DB таблица. UI: prompt на таблото, бутон на login, управление в профил. Всичко зад `NEXT_PUBLIC_PASSKEYS_ENABLED` флаг + capability guard.

**Tech Stack:** Next.js 16, better-auth ^1.6.8 passkey plugin, Drizzle/Postgres (Supabase), React 19. Без тест-харнес — верификация = `npm run build` + capability/flag guards + парола fallback. Биометрията на реално устройство я тества потребителят.

**Spec:** `docs/superpowers/specs/2026-06-11-staff-biometric-login-design.md`

---

## Task 1: Wire passkey плъгина (сървър + клиент)

**Files:**
- Modify: `src/lib/auth.ts`
- Modify: `src/lib/auth-client.ts`
- Modify: `package.json` (dependency)

- [ ] **Step 1: Установи точния пакет/import за passkey плъгина за better-auth ^1.6.8**

Провери инсталираната версия и къде живее passkey плъгинът: `npm ls better-auth`. В better-auth 1.x passkey е под `better-auth/plugins` (сървър) и `better-auth/client/plugins` (клиент). Потвърди с: `node -e "console.log(Object.keys(require('better-auth/plugins')))"` — трябва да съдържа `passkey`. Ако не е там, провери `@better-auth/passkey` и `npm install @better-auth/passkey`. Запиши кой import работи.

- [ ] **Step 2: Добави passkey() в auth.ts plugins**

В `src/lib/auth.ts` добави import и `plugins` масив (betterAuth все още няма plugins ключ — добави го):

```ts
import { passkey } from "better-auth/plugins"; // или @better-auth/passkey ако Step 1 така е показал

// в betterAuth({ ... }) конфигурацията, добави:
  plugins: [
    passkey({
      rpID: process.env.NODE_ENV === "production" ? "euphoriabeauty.eu" : "localhost",
      rpName: "Euphoria",
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        residentKey: "preferred",
        userVerification: "preferred",
      },
    }),
  ],
```

Бележка: ако сигнатурата на passkey() в инсталираната версия използва `advanced.rpID`/различни ключове (видя се в Step 1 типовете), адаптирай имената, но запази: rpID=euphoriabeauty.eu в prod / localhost в dev, rpName="Euphoria", platform authenticator.

- [ ] **Step 3: Добави passkeyClient() в auth-client.ts**

```ts
import { createAuthClient } from "better-auth/react";
import { passkeyClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_SITE_URL,
  plugins: [passkeyClient()],
});

export const { signIn, signOut, signUp, useSession } = authClient;
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: без грешки в auth.ts / auth-client.ts (passkey таблицата още я няма — adapter-ът се добавя в Task 2; ако tsc се оплаче за schema mapping, продължи към Task 2 и type-check-ни наедно).

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth.ts src/lib/auth-client.ts package.json package-lock.json
git commit -m "Staff biometric: wire passkey plugin (server + client)"
```

---

## Task 2: `passkey` DB таблица + adapter mapping

**Files:**
- Modify: `src/lib/db/schema.ts`
- Modify: `src/lib/auth.ts` (drizzleAdapter schema map)

- [ ] **Step 1: Добави passkey таблицата в schema.ts**

Следвай патърна на съществуващите better-auth таблици (user/session/account/verification). Добави след тях:

```ts
export const passkey = pgTable("passkey", {
  id: text("id").primaryKey(),
  name: text("name"),
  publicKey: text("public_key").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  credentialID: text("credential_id").notNull(),
  counter: integer("counter").notNull().default(0),
  deviceType: text("device_type").notNull(),
  backedUp: boolean("backed_up").notNull().default(false),
  transports: text("transports"),
  createdAt: ts("created_at").$defaultFn(() => new Date()),
  aaguid: text("aaguid"),
});
```

(`ts` helper, `pgTable`, `text`, `integer`, `boolean` вече се импортват в schema.ts.)

- [ ] **Step 2: Регистрирай passkey в drizzleAdapter schema map в auth.ts**

```ts
schema: {
  user: schema.user,
  session: schema.session,
  account: schema.account,
  verification: schema.verification,
  passkey: schema.passkey,
},
```

- [ ] **Step 3: Type-check + build**

Run: `npx tsc --noEmit` после `npm run build`
Expected: зелено. (Build НЕ изисква таблицата да съществува в DB — само типовете.)

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/schema.ts src/lib/auth.ts
git commit -m "Staff biometric: passkey table + adapter mapping"
```

- [ ] **Step 5: Документирай миграцията (агентът е блокиран от prod db:push)**

Добави кратка бележка в plan-а/README, че потребителят пуска `npm run db:push` срещу Supabase, за да създаде `passkey` таблицата. Не я пускай сам.

---

## Task 3: Capability helper + „Влез с отпечатък" бутон на login

**Files:**
- Create: `src/lib/passkey-support.ts`
- Create: `src/components/staff/biometric-login-button.tsx`
- Modify: `src/app/staff/login/page.tsx`

- [ ] **Step 1: Capability helper**

`src/lib/passkey-support.ts`:

```ts
/** Включена ли е функцията (env флаг) — за да не се показва преди миграцията. */
export const passkeysEnabled = process.env.NEXT_PUBLIC_PASSKEYS_ENABLED === "1";

/** Поддържа ли устройството вграден биометричен authenticator. Client-only. */
export async function platformAuthenticatorAvailable(): Promise<boolean> {
  if (typeof window === "undefined" || !window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}
```

- [ ] **Step 2: BiometricLoginButton**

`src/components/staff/biometric-login-button.tsx` (`"use client"`): на mount проверява `passkeysEnabled && await platformAuthenticatorAvailable()`; ако не → рендира null. Иначе бутон „Влез с отпечатък" (Fingerprint икона от lucide), който вика:

```ts
await authClient.signIn.passkey({
  fetchOptions: {
    onSuccess() { window.location.href = "/staff"; },
    onError() { toast.error("Не се получи. Опитай с парола."); },
  },
});
```

Обвий в try/catch за отказ от OS диалога → `toast("Отказано")`. Стил: пълна ширина, над формата, `bg-foreground text-background hover:bg-primary`, h-11 rounded-md.

- [ ] **Step 3: Вгради бутона на login страницата**

В `src/app/staff/login/page.tsx`, НАД формата за имейл/парола: `<BiometricLoginButton />` + дискретен разделител „или с парола". Формата остава непокътната като fallback.

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: ✓ зелено, /staff/login се компилира.

- [ ] **Step 5: Commit**

```bash
git add src/lib/passkey-support.ts src/components/staff/biometric-login-button.tsx src/app/staff/login/page.tsx
git commit -m "Staff biometric: login button (capability + flag guarded)"
```

---

## Task 4: Prompt след вход на таблото

**Files:**
- Create: `src/components/staff/biometric-prompt.tsx`
- Modify: `src/app/staff/page.tsx`

- [ ] **Step 1: BiometricPrompt компонент**

`src/components/staff/biometric-prompt.tsx` (`"use client"`). На mount, в useEffect:
- ако НЕ (`passkeysEnabled` && `await platformAuthenticatorAvailable()`) → нищо.
- ако `localStorage.getItem("biometric-prompt-dismissed") === "1"` → нищо.
- провери дали вече има passkey: `const res = await authClient.passkey.listUserPasskeys(); if (res.data?.length) return;` (ако методът хвърли, защото таблицата липсва → catch → нищо).
- иначе покажи ненатрапчив банер (rounded-2xl border bg-cream p-4) с текст „Влизай по-бързо с пръстов отпечатък?" + бутони „Да" / „Не сега".
  - „Да": `await authClient.passkey.addPasskey({ authenticatorAttachment: "platform" })`; при успех `toast.success("Готово - следващия път влез с отпечатък.")` и скрий банера; при отказ/грешка `toast`.
  - „Не сега": `localStorage.setItem("biometric-prompt-dismissed", "1")`; скрий.

- [ ] **Step 2: Вгради на таблото**

В `src/app/staff/page.tsx` (горе в съдържанието, под header-а) добави `<BiometricPrompt />`. Компонентът сам решава дали да се покаже.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: ✓ зелено.

- [ ] **Step 4: Commit**

```bash
git add src/components/staff/biometric-prompt.tsx src/app/staff/page.tsx
git commit -m "Staff biometric: one-time enroll prompt on dashboard"
```

---

## Task 5: Управление в профила

**Files:**
- Create: `src/components/staff/biometric-manage.tsx`
- Modify: `src/app/staff/profile/page.tsx`

- [ ] **Step 1: BiometricManage компонент**

`src/components/staff/biometric-manage.tsx` (`"use client"`). Ако НЕ (`passkeysEnabled` && supported) → рендира кратко „Не се поддържа на това устройство" или null. Иначе:
- `listUserPasskeys()` → ако има поне един: статус „Включено на това устройство" + бутон „Премахни" (`authClient.passkey.deletePasskey({ id })` → refresh списъка, toast).
- ако няма: бутон „Добави този телефон" (`addPasskey({ authenticatorAttachment: "platform" })` → toast → refresh).
Зареждай списъка в useEffect с loading state; всичко в try/catch (таблицата може да липсва преди миграция).

- [ ] **Step 2: Вгради в профила**

В `src/app/staff/profile/page.tsx` добави секция „Вход с отпечатък" с `<BiometricManage />` (като другите секции — заглавие + компонент).

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: ✓ зелено.

- [ ] **Step 4: Commit**

```bash
git add src/components/staff/biometric-manage.tsx src/app/staff/profile/page.tsx
git commit -m "Staff biometric: manage passkeys in profile"
```

---

## Task 6: Push + верификация + инструкции за активиране

**Files:** няма (verification + docs)

- [ ] **Step 1: Финален build**

Run: `npm run build`
Expected: ✓ зелено, всички staff страници се компилират.

- [ ] **Step 2: Push**

```bash
git push
```

- [ ] **Step 3: Жива верификация (flag OFF — нула регресия)**

Понеже `NEXT_PUBLIC_PASSKEYS_ENABLED` не е сетнат в prod, biometric UI-ят НЕ трябва да се показва. Playwright (НЕ curl): `/staff/login` → НЯМА „Влез с отпечатък" бутон, формата за парола работи; `/staff` (след вход) → няма prompt. Това доказва zero-regression преди активиране.

- [ ] **Step 4: Инструкции за потребителя (активиране)**

Изведи ясно: за да включи биометрията потребителят трябва (1) `npm run db:push` (създава passkey таблицата в Supabase), (2) да добави `NEXT_PUBLIC_PASSKEYS_ENABLED=1` във Vercel env + redeploy, (3) на реален телефон: вход с парола → prompt → „Да" → регистрира отпечатък → следващ вход с бутона. Финалното потвърждение на самата биометрия е на негово устройство.

---

## Дефиниция за готовност (spec §8)

- `next build` зелен; всички staff страници се компилират.
- С flag OFF (prod по подразбиране): нула biometric UI, паролата работи — нула регресия (Playwright).
- Capability guard: на неподдържащо устройство нищо не се показва.
- Парола fallback винаги наличен.
- Активирането (db:push + env flag + device enroll) е документирано за потребителя.
