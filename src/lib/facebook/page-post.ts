/**
 * Публикуване на обява в страницата във Facebook (Graph API, POST /{page-id}/feed с message и link).
 * По бележката за кода в доклада от 22.11.2026 (dev-facebook-стъпки, раздел 4).
 *
 * НЕ се вика само: функцията е готова, викането от «Публикувай» чака ключ и думата на собственика.
 * Не е server action (без "use server"). Ключът е само в средата (FACEBOOK_PAGE_ACCESS_TOKEN,
 * никога NEXT_PUBLIC_), праща се в тялото, не в адреса, и не влиза в резултат, лог или грешка.
 */

export const GRAPH_API_VERSION = "v27.0";
const DEFAULT_TIMEOUT_MS = 10_000;

export type FacebookPostResult =
  /** «излезе»: номерът и адресът на поста. */
  | { status: "posted"; postId: string; postUrl: string }
  /** «не е настроено»: няма ID на страницата или ключ; опит не е правен. */
  | { status: "off" }
  /** «ключът не важи»: изтекъл, отнет или без права (трябва нов ключ). */
  | { status: "token_invalid"; code: number; subcode: number | null }
  /** «грешка»: мрежа, таймаут, 5xx, друг отказ. reason е кратка причина без ключа. */
  | { status: "error"; reason: string };

export interface FacebookPostOptions {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  env?: { FACEBOOK_PAGE_ID?: string; FACEBOOK_PAGE_ACCESS_TOKEN?: string };
}

// 190: ключът е изтекъл или отнет (подкодове 458, 460, 463, 467, 2069032).
// 10 и 200–299: няма право; 1/2853006: «Viewer doesn't have permission to perform this action.»
function isTokenProblem(code: number, subcode: number | null) {
  return code === 190 || code === 10 || (code >= 200 && code <= 299) || (code === 1 && subcode === 2853006);
}

/** Публикува message + link (публичният адрес на обявата; картината идва от og:image на връзката). */
export async function postListingToFacebookPage(
  input: { message: string; link: string },
  opts: FacebookPostOptions = {},
): Promise<FacebookPostResult> {
  const env = opts.env ?? process.env;
  const pageId = env.FACEBOOK_PAGE_ID?.trim();
  const token = env.FACEBOOK_PAGE_ACCESS_TOKEN?.trim();
  if (!pageId || !token) return { status: "off" };
  if (!/^\d+$/.test(pageId)) return { status: "error", reason: "page_id_invalid" };
  // Facebook отказва пост, чиято връзка не вижда: само публичен https адрес, не localhost.
  let linkUrl: URL;
  try {
    linkUrl = new URL(input.link);
  } catch {
    return { status: "error", reason: "link_invalid" };
  }
  if (linkUrl.protocol !== "https:" || ["localhost", "127.0.0.1"].includes(linkUrl.hostname)) {
    return { status: "error", reason: "link_not_public" };
  }

  const fetchImpl = opts.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetchImpl(`https://graph.facebook.com/${GRAPH_API_VERSION}/${pageId}/feed`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ message: input.message, link: linkUrl.toString(), access_token: token }),
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    return { status: "error", reason: controller.signal.aborted ? "timeout" : `network:${(e as Error)?.name ?? "Error"}` };
  }

  // Тялото се чете още под таймаута: Facebook може да прати заглавките и да спре по средата.
  let body: { id?: unknown; error?: { code?: unknown; error_subcode?: unknown } } | null = null;
  try {
    body = await res.json();
  } catch {
    if (controller.signal.aborted) return { status: "error", reason: "timeout" };
    body = null;
  } finally {
    clearTimeout(timer);
  }

  if (res.ok && typeof body?.id === "string" && body.id) {
    return { status: "posted", postId: body.id, postUrl: `https://www.facebook.com/${body.id}` };
  }
  const code = typeof body?.error?.code === "number" ? body.error.code : null;
  const subcode = typeof body?.error?.error_subcode === "number" ? body.error.error_subcode : null;
  if (code !== null && isTokenProblem(code, subcode)) return { status: "token_invalid", code, subcode };
  return { status: "error", reason: code !== null ? `http_${res.status}:code_${code}` : `http_${res.status}` };
}

// ── Промоциите (№11, част 4): пост с картина, карусел и триене ──

function credentials(opts: FacebookPostOptions): { pageId: string; token: string } | FacebookPostResult {
  const env = opts.env ?? process.env;
  const pageId = env.FACEBOOK_PAGE_ID?.trim();
  const token = env.FACEBOOK_PAGE_ACCESS_TOKEN?.trim();
  if (!pageId || !token) return { status: "off" };
  if (!/^\d+$/.test(pageId)) return { status: "error", reason: "page_id_invalid" };
  return { pageId, token };
}

/** Facebook чете само публичен https адрес (картината, връзката), не localhost. */
function isPublicHttps(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && !["localhost", "127.0.0.1"].includes(u.hostname);
  } catch {
    return false;
  }
}

/** Една заявка към Graph API (POST с тялото като форма; ключът е в тялото, не в адреса). */
async function graphPost(
  path: string,
  params: Record<string, string>,
  token: string,
  opts: FacebookPostOptions,
): Promise<{ ok: true; body: Record<string, unknown> } | FacebookPostResult> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetchImpl(`https://graph.facebook.com/${GRAPH_API_VERSION}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ ...params, access_token: token }),
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    return { status: "error", reason: controller.signal.aborted ? "timeout" : `network:${(e as Error)?.name ?? "Error"}` };
  }
  let body: Record<string, unknown> | null = null;
  try {
    body = (await res.json()) as Record<string, unknown>;
  } catch {
    if (controller.signal.aborted) return { status: "error", reason: "timeout" };
    body = null;
  } finally {
    clearTimeout(timer);
  }
  if (res.ok && body && !body.error) return { ok: true, body };
  const err = (body?.error ?? {}) as { code?: unknown; error_subcode?: unknown };
  const code = typeof err.code === "number" ? err.code : null;
  const subcode = typeof err.error_subcode === "number" ? err.error_subcode : null;
  if (code !== null && isTokenProblem(code, subcode)) return { status: "token_invalid", code, subcode };
  return { status: "error", reason: code !== null ? `http_${res.status}:code_${code}` : `http_${res.status}` };
}

const postUrlOf = (postId: string) => `https://www.facebook.com/${postId}`;

/**
 * Пост с картина (POST /{page-id}/photos, url + caption): картината на промоцията 4:5, текстът с връзката е в
 * подписа. Връща post_id (той се трие), не id на снимката.
 */
export async function postPhotoToFacebookPage(
  input: { caption: string; imageUrl: string },
  opts: FacebookPostOptions = {},
): Promise<FacebookPostResult> {
  const cred = credentials(opts);
  if ("status" in cred) return cred;
  if (!isPublicHttps(input.imageUrl)) return { status: "error", reason: "image_not_public" };
  const r = await graphPost(`${cred.pageId}/photos`, { url: input.imageUrl, caption: input.caption }, cred.token, opts);
  if ("status" in r) return r;
  const postId = typeof r.body.post_id === "string" && r.body.post_id ? r.body.post_id : typeof r.body.id === "string" ? r.body.id : "";
  if (!postId) return { status: "error", reason: "no_post_id" };
  return { status: "posted", postId, postUrl: postUrlOf(postId) };
}

export interface CarouselCard {
  link: string;
  picture: string;
  name: string;
  description: string;
}

/**
 * Пост с карусел (POST /{page-id}/feed с child_attachments): от 2 до 5 карти, всяка със своя връзка и картина.
 * Meta: «Minimum 2 and maximum of 5 objects»; своя картина и заглавие се приемат само за връзка, която
 * страницата притежава (проверен домейн).
 */
export async function postCarouselToFacebookPage(
  input: { message: string; link: string; cards: CarouselCard[] },
  opts: FacebookPostOptions = {},
): Promise<FacebookPostResult> {
  const cred = credentials(opts);
  if ("status" in cred) return cred;
  const cards = input.cards.slice(0, 5);
  if (cards.length < 2) return { status: "error", reason: "carousel_too_small" };
  if (![input.link, ...cards.flatMap((c) => [c.link, c.picture])].every(isPublicHttps)) {
    return { status: "error", reason: "link_not_public" };
  }
  const r = await graphPost(
    `${cred.pageId}/feed`,
    { message: input.message, link: input.link, child_attachments: JSON.stringify(cards) },
    cred.token,
    opts,
  );
  if ("status" in r) return r;
  const postId = typeof r.body.id === "string" ? r.body.id : "";
  if (!postId) return { status: "error", reason: "no_post_id" };
  return { status: "posted", postId, postUrl: postUrlOf(postId) };
}

export type FacebookDeleteResult =
  | { status: "deleted" }
  | { status: "off" }
  | { status: "token_invalid"; code: number; subcode: number | null }
  | { status: "error"; reason: string };

/** Трие пост от страницата (/{post-id}; method=delete в тялото, за да не е ключът в адреса). */
export async function deleteFacebookPost(postId: string, opts: FacebookPostOptions = {}): Promise<FacebookDeleteResult> {
  const cred = credentials(opts);
  if ("status" in cred) return cred as FacebookDeleteResult;
  if (!/^[\d_]+$/.test(postId)) return { status: "error", reason: "post_id_invalid" };
  const r = await graphPost(postId, { method: "delete" }, cred.token, opts);
  if ("status" in r) return r as FacebookDeleteResult;
  return r.body.success === true ? { status: "deleted" } : { status: "error", reason: "not_deleted" };
}
