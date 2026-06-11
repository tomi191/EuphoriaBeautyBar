import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireAdmin } from "@/lib/actions/auth-guard";
import { discoverLocation, exchangeCode, saveConnection } from "@/lib/google-oauth";

export const dynamic = "force-dynamic";

/** Връщане от Google: code → refresh token + автоматично откриване на локацията. */
export async function GET(req: Request) {
  await requireAdmin();

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const cookieStore = await cookies();
  const savedState = cookieStore.get("gbp_oauth_state")?.value;
  cookieStore.delete("gbp_oauth_state");

  const fail = (reason: string) =>
    NextResponse.redirect(new URL(`/admin/reviews?oauth_error=${encodeURIComponent(reason)}`, req.url));

  if (!code || !state || state !== savedState) return fail("invalid-state");

  try {
    const redirectUri = new URL("/api/google/oauth/callback", req.url).toString();
    const tokens = await exchangeCode(code, redirectUri);
    if (!tokens.refresh_token) return fail("no-refresh-token");

    const location = await discoverLocation(tokens.access_token);
    await saveConnection({
      refreshToken: tokens.refresh_token,
      ...location,
      connectedAt: new Date().toISOString(),
    });

    return NextResponse.redirect(new URL("/admin/reviews?connected=1", req.url));
  } catch (err) {
    console.error("[google-oauth] callback failed", err);
    return fail("exchange-failed");
  }
}
