import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireAdmin } from "@/lib/actions/auth-guard";
import { buildAuthUrl, oauthConfigured } from "@/lib/google-oauth";

export const dynamic = "force-dynamic";

/** Старт на „Свържи с Google“: CSRF state в cookie → Google consent екран. */
export async function GET(req: Request) {
  await requireAdmin();
  if (!oauthConfigured()) {
    return NextResponse.redirect(new URL("/admin/reviews?oauth_error=not-configured", req.url));
  }

  const state = crypto.randomUUID();
  const redirectUri = new URL("/api/google/oauth/callback", req.url).toString();

  const cookieStore = await cookies();
  cookieStore.set("gbp_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return NextResponse.redirect(buildAuthUrl(redirectUri, state));
}
