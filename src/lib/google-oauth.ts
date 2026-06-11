/**
 * Google Business Profile OAuth — „логни се с Google и теглим отзивите“.
 *
 * Безплатният път (като WP плъгините): собственикът на бизнес профила се
 * логва веднъж, пазим refresh token-а му и теглим ВСИЧКИ отзиви + рейтинга
 * през Business Profile API (без billing, без карта). API-то изисква
 * еднократно одобрение на GCP проекта от Google (access request form).
 *
 * Env: GOOGLE_OAUTH_CLIENT_ID + GOOGLE_OAUTH_CLIENT_SECRET (OAuth client от
 * същия одобрен проект). Връзката се пази в site_settings.
 */
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { PlaceSummary } from "@/lib/google-business";

const SCOPE = "https://www.googleapis.com/auth/business.manage";
const SETTINGS_KEY = "google_business_oauth";

export interface GbpConnection {
  refreshToken: string;
  /** "accounts/<id>" */
  accountName: string;
  /** "locations/<id>" */
  locationName: string;
  locationTitle: string;
  connectedAt: string;
}

export function oauthConfigured(): boolean {
  return !!process.env.GOOGLE_OAUTH_CLIENT_ID && !!process.env.GOOGLE_OAUTH_CLIENT_SECRET;
}

export function buildAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    // prompt=consent гарантира refresh_token и при повторно свързване
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

export async function exchangeCode(code: string, redirectUri: string): Promise<TokenResponse> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`OAuth token exchange ${res.status}: ${await res.text()}`);
  return (await res.json()) as TokenResponse;
}

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`OAuth refresh ${res.status}: ${await res.text()}`);
  return ((await res.json()) as TokenResponse).access_token;
}

export async function getConnection(): Promise<GbpConnection | null> {
  const row = await db.query.siteSettings.findFirst({
    where: (s, { eq }) => eq(s.key, SETTINGS_KEY),
  });
  return row ? (row.value as unknown as GbpConnection) : null;
}

export async function saveConnection(conn: GbpConnection): Promise<void> {
  await db
    .insert(schema.siteSettings)
    .values({ key: SETTINGS_KEY, value: conn, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: schema.siteSettings.key,
      set: { value: conn, updatedAt: new Date() },
    });
}

export async function deleteConnection(): Promise<void> {
  await db.delete(schema.siteSettings).where(eq(schema.siteSettings.key, SETTINGS_KEY));
}

/** Първият account + първата location на логнатия потребител (салонът има една). */
export async function discoverLocation(
  accessToken: string,
): Promise<Pick<GbpConnection, "accountName" | "locationName" | "locationTitle">> {
  const headers = { Authorization: `Bearer ${accessToken}` };

  const accRes = await fetch("https://mybusinessaccountmanagement.googleapis.com/v1/accounts", { headers });
  if (!accRes.ok) throw new Error(`GBP accounts ${accRes.status}: ${await accRes.text()}`);
  const accJson = (await accRes.json()) as { accounts?: Array<{ name: string }> };
  const account = accJson.accounts?.[0];
  if (!account) throw new Error("Google акаунтът няма Business Profile акаунти.");

  const locRes = await fetch(
    `https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations?readMask=name,title&pageSize=10`,
    { headers },
  );
  if (!locRes.ok) throw new Error(`GBP locations ${locRes.status}: ${await locRes.text()}`);
  const locJson = (await locRes.json()) as { locations?: Array<{ name: string; title?: string }> };
  const location = locJson.locations?.[0];
  if (!location) throw new Error("Business Profile акаунтът няма локации.");

  return {
    accountName: account.name,
    locationName: location.name,
    locationTitle: location.title ?? "",
  };
}

const STAR_TO_NUM: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };

interface GbpReview {
  reviewer?: { displayName?: string; profilePhotoUrl?: string };
  starRating?: string;
  comment?: string;
  createTime?: string;
  updateTime?: string;
}

/**
 * Всички отзиви + среден рейтинг през Business Profile API (v4 — reviews
 * никога не са мигрирани към новите split API-та). До 4 страници × 50.
 */
export async function fetchGbpReviews(): Promise<PlaceSummary | null> {
  if (!oauthConfigured()) return null;
  const conn = await getConnection();
  if (!conn) return null;

  try {
    const accessToken = await refreshAccessToken(conn.refreshToken);
    const headers = { Authorization: `Bearer ${accessToken}` };
    const base = `https://mybusiness.googleapis.com/v4/${conn.accountName}/${conn.locationName}/reviews`;

    const all: GbpReview[] = [];
    let averageRating = 0;
    let totalReviewCount = 0;
    let pageToken: string | undefined;

    for (let page = 0; page < 4; page++) {
      const url = `${base}?pageSize=50${pageToken ? `&pageToken=${pageToken}` : ""}`;
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(`GBP reviews ${res.status}: ${await res.text()}`);
      const json = (await res.json()) as {
        reviews?: GbpReview[];
        averageRating?: number;
        totalReviewCount?: number;
        nextPageToken?: string;
      };
      all.push(...(json.reviews ?? []));
      averageRating = json.averageRating ?? averageRating;
      totalReviewCount = json.totalReviewCount ?? totalReviewCount;
      pageToken = json.nextPageToken;
      if (!pageToken) break;
    }

    return {
      rating: averageRating,
      totalReviews: totalReviewCount,
      reviews: all
        .filter((r) => r.reviewer?.displayName && r.comment)
        .map((r) => ({
          authorName: r.reviewer!.displayName!,
          authorPhoto: r.reviewer?.profilePhotoUrl,
          rating: STAR_TO_NUM[r.starRating ?? ""] ?? 5,
          text: r.comment!,
          language: undefined,
          publishedAt: new Date(r.createTime ?? r.updateTime ?? Date.now()),
        })),
    };
  } catch (err) {
    console.error("[google-oauth] reviews fetch failed", err);
    return null;
  }
}
