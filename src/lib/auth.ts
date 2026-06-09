import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
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
    },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 14, // 14 дни
    updateAge: 60 * 60 * 24, // на ден
  },
  user: {
    additionalFields: {
      role: { type: "string", defaultValue: "admin", input: false },
    },
  },
  trustedOrigins: [
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    "http://localhost:3000",
    "http://localhost:3003",
  ],
});

export type Session = typeof auth.$Infer.Session;
