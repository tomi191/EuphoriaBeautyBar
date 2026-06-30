import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { passkey } from "@better-auth/passkey";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
      passkey: schema.passkey,
    },
  }),
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
  emailAndPassword: {
    enabled: true,
    // Спира sign-up изцяло (HTTP endpoint И auth.api.signUpEmail — better-auth го
    // проверява в самия route). Без него всеки можеше POST /api/auth/sign-up/email →
    // нов акаунт. Легитимните акаунти се правят САМО с директен insert + ctx.password.hash
    // (createStaffAccount, seed ensureAdmin) с изрична роля.
    disableSignUp: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 14, // 14 дни
    updateAge: 60 * 60 * 24, // на ден
    // Кешира сесията в подписана cookie за 5 мин → requireStaff спестява session
    // DB lookup на ВСЯКА навигация (остава само resource заявката). Logout пак
    // чисти cookie-то; role промяна се отразява до 5 мин.
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  user: {
    additionalFields: {
      // defaultValue е защитна мрежа — реалните роли се задават изрично при insert
      // (createStaffAccount → "staff", seed ensureAdmin → "admin"). „staff" е по-
      // безопасен default, ако някога нов път създаде user без явна роля.
      role: { type: "string", defaultValue: "staff", input: false },
    },
  },
  trustedOrigins: [
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    // Production живее на www (Vercel redirect-ва apex → www) — и двата са доверени,
    // иначе login от www.euphoriabeauty.eu връща 403.
    "https://euphoriabeauty.eu",
    "https://www.euphoriabeauty.eu",
    "http://localhost:3000",
    "http://localhost:3003",
  ],
});

export type Session = typeof auth.$Infer.Session;
