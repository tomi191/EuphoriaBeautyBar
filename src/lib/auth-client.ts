"use client";

import { createAuthClient } from "better-auth/react";
import { passkeyClient } from "@better-auth/passkey/client";

export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_SITE_URL,
  plugins: [passkeyClient()],
});

export const { signIn, signOut, signUp, useSession } = authClient;
