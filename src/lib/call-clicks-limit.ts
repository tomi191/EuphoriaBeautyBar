import { createHash, randomBytes } from "node:crypto";

/**
 * Таван на заявките в паметта на процеса: perKey от един адрес и total общо за прозореца.
 * Адресът не се пази: ключът е отпечатък със случайна сол, която живее само в паметта и се сменя с процеса.
 */
export function createRateLimiter(opts: { perKey: number; total: number; windowMs: number }) {
  const salt = randomBytes(16);
  let windowStart = 0;
  let total = 0;
  let hits = new Map<string, number>();
  return function allow(key: string, now: number): boolean {
    if (now - windowStart >= opts.windowMs) {
      windowStart = now;
      total = 0;
      hits = new Map();
    }
    if (total >= opts.total) return false;
    const k = createHash("sha256").update(salt).update(key).digest("base64url").slice(0, 16);
    const n = hits.get(k) ?? 0;
    if (n >= opts.perKey) return false;
    hits.set(k, n + 1);
    total++;
    return true;
  };
}
