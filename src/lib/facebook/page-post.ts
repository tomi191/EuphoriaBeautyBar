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
    return { status: "error", reason: controller.signal.aborted ? "timeout" : `network:${(e as Error)?.name ?? "Error"}` };
  } finally {
    clearTimeout(timer);
  }

  let body: { id?: unknown; error?: { code?: unknown; error_subcode?: unknown } } | null = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (res.ok && typeof body?.id === "string" && body.id) {
    return { status: "posted", postId: body.id, postUrl: `https://www.facebook.com/${body.id}` };
  }
  const code = typeof body?.error?.code === "number" ? body.error.code : null;
  const subcode = typeof body?.error?.error_subcode === "number" ? body.error.error_subcode : null;
  if (code !== null && isTokenProblem(code, subcode)) return { status: "token_invalid", code, subcode };
  return { status: "error", reason: code !== null ? `http_${res.status}:code_${code}` : `http_${res.status}` };
}
