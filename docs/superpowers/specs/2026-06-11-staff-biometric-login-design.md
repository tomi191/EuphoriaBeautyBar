# Staff PWA биометрична верификация — дизайн

**Дата:** 2026-06-11
**Статус:** одобрен дизайн, чака implementation plan
**Контекст:** Staff PWA (/staff) се ползва на телефон от изпълнителите. Сега вход = имейл+парола
(better-auth, emailAndPassword). Целта: след първия вход да се предложи запомняне на пръстов
отпечатък/Face ID, за да влизат с едно докосване следващите пъти.

---

## 1. Цел и обхват

- **Бърз вход с биометрия** (platform authenticator = вграденият сензор на телефона) като
  по-бърза алтернатива на паролата. Паролата ОСТАВА като fallback.
- **Prompt след първи вход:** еднократно предложение на staff таблото да се включи биометрия.
- **Управление в профила:** добавяне/премахване на регистриран отпечатък.

Не-цели (YAGNI): 2FA (биометрията не е втори фактор, а алтернатива); премахване на паролата;
биометрия за публичния сайт или /admin (само /staff); cross-platform passkeys/USB ключове
(само `platform` authenticator).

---

## 2. Технология

better-auth **passkey плъгин** (WebAuthn). Не пишем суров WebAuthn — плъгинът капсулова
challenge/registration/authentication и криптографията.

- **Пакет:** passkey плъгинът на better-auth (точният import path/пакет за версия ^1.6.8 се
  верифицира на имплементация — `better-auth/plugins` или `@better-auth/passkey`).
- **Сървър** (`src/lib/auth.ts`): `passkey({ rpID, rpName, origin, authenticatorSelection })`.
- **Клиент** (`src/lib/auth-client.ts`): `passkeyClient()` плъгин → `authClient.passkey.addPasskey`,
  `authClient.signIn.passkey`, `authClient.passkey.listUserPasskeys`, `authClient.passkey.deletePasskey`.

### Конфигурация (критична — грешен rpID чупи WebAuthn)
- `rpID: "euphoriabeauty.eu"` — registrable домейн; покрива и www, и apex.
- `rpName: "Euphoria"`.
- `origin`: `["https://www.euphoriabeauty.eu", "http://localhost:3000"]` (dev).
- `authenticatorSelection`: `{ authenticatorAttachment: "platform", residentKey: "preferred", userVerification: "preferred" }` — само вграден сензор.

WebAuthn изисква secure context (HTTPS) — production е на www (✓), localhost е разрешен от спецификацията.

---

## 3. База данни

Нова таблица `passkey` (drizzle, `src/lib/db/schema.ts`) + регистрация в `drizzleAdapter` schema
в `auth.ts`. Полета (по passkey-плъгина): id (pk), name?, publicKey, userId (fk→user, cascade),
credentialID, counter (int), deviceType, backedUp (bool), transports?, createdAt?, aaguid?.

⚠️ **Миграция:** `npm run db:push` срещу Supabase създава таблицата. Агентът е блокиран от prod
DB мутации → **потребителят пуска push-а**. До тогава функцията е guarded (виж §6) и нищо не се чупи.

---

## 4. Потребителски поток

1. **Първи вход:** имейл+парола (`/staff/login`, без промяна).
2. **Prompt след вход:** на staff таблото (`/staff`), еднократен ненатрапчив банер/диалог:
   „Влизай по-бързо с пръстов отпечатък?“ с „Да“ / „Не сега“.
   - Показва се САМО ако: (а) функцията е включена (`NEXT_PUBLIC_PASSKEYS_ENABLED === "1"`, §6), И
     (б) устройството поддържа platform authenticator
     (`PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()` → true), И
     (в) потребителят още няма регистриран passkey, И (г) не е отхвърлял преди
     (localStorage флаг `biometric-prompt-dismissed`).
   - „Да“ → `authClient.passkey.addPasskey({ authenticatorAttachment: "platform" })` → OS диалог
     за пръст/лице → при успех toast „Готово, следващия път влез с отпечатък“.
   - „Не сега“ → сетва localStorage флага; не се показва пак (но може от профила).
3. **Следващ вход:** `/staff/login` показва бутон **„Влез с отпечатък“** НАД формата за парола
   (показва се само ако platform authenticator е наличен). Натискане → `authClient.signIn.passkey()`
   → OS сензор → редирект към `/staff`. Формата за имейл+парола остава отдолу като fallback.
4. **Профил** (`/staff/profile`): секция „Вход с отпечатък“ — статус (включен/изключен), бутон
   „Добави този телефон“ (`addPasskey`) и „Премахни“ (`deletePasskey` + `listUserPasskeys`).

---

## 5. Компоненти / файлове

| Файл | Действие |
|------|----------|
| `src/lib/auth.ts` | + passkey() server плъгин + passkey в drizzleAdapter schema |
| `src/lib/auth-client.ts` | + passkeyClient() плъгин |
| `src/lib/db/schema.ts` | + `passkey` таблица |
| `src/components/staff/biometric-prompt.tsx` | НОВ — еднократен prompt на таблото (client; capability + dismissed guard) |
| `src/components/staff/biometric-login-button.tsx` | НОВ — „Влез с отпечатък“ на login (client; показва се при поддръжка) |
| `src/components/staff/biometric-manage.tsx` | НОВ — секция в профила (списък/добави/премахни) |
| `src/app/staff/page.tsx` | вгражда `<BiometricPrompt />` |
| `src/app/staff/login/page.tsx` | вгражда `<BiometricLoginButton />` над формата |
| `src/app/staff/profile/page.tsx` | вгражда `<BiometricManage />` |
| `package.json` | + passkey плъгин зависимост |
| `scripts/` (по избор) | бележка/README за `db:push` |

---

## 6. Error handling / guards

- **Без поддръжка:** ако `isUserVerifyingPlatformAuthenticatorAvailable()` е false → prompt-ът и
  login бутонът НЕ се рендират. Само паролата.
- **Отказ от OS диалога / прекъсване:** catch → спокоен toast („Отказано“ / „Не се получи, опитай пак“),
  без счупено състояние.
- **Таблицата липсва (преди db:push):** server actions на плъгина ще връщат грешка → клиентът я
  лови и показва toast; prompt-ът се появява, но enrollment-ът се проваля „меко“. За да не се
  показва преди да е готово, добавяме env флаг `NEXT_PUBLIC_PASSKEYS_ENABLED` (default off) —
  prompt/бутон се появяват само когато е "1". Включва се след миграцията.
- **Загубен/сменен телефон:** паролата винаги работи; нов телефон → нов addPasskey.
- **Offline:** биометричният вход изисква мрежа (challenge от сървъра) — при офлайн бутонът дава
  toast „Нужна е връзка“; паролата също изисква мрежа, така че не е регресия.

---

## 7. Сигурност

- Passkey плъгинът ползва стандартен WebAuthn — публичен ключ в DB, частният не напуска устройството.
- Само `platform` authenticator + `userVerification` → изисква реална биометрия/PIN на устройството.
- Не отслабва съществуващата защита: паролата остава, role-guard-овете (requireStaff/requireAdmin)
  не се променят. Passkey-ят само заменя „как доказваш кой си“ на login, не „какво ти е позволено“.

---

## 8. Верификация (definition of done)

- `next build` зелен.
- Локално (или на staging): с `NEXT_PUBLIC_PASSKEYS_ENABLED=1` + мигрирана таблица — на поддържащо
  устройство prompt-ът се появява след вход, addPasskey регистрира, signIn.passkey влиза.
- На неподдържащо устройство/браузър — нищо не се показва, паролата работи нормално.
- Паролата работи като fallback независимо от passkey.
- Без passkey таблица / флаг off — сайтът работи както преди (нула регресия).

⚠️ Пълната жива проверка на самата биометрия изисква реално устройство с пръстов сензор —
финалното потвърждение го прави потребителят на телефона си (както при PWA инсталацията).
