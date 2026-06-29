/* eslint-disable no-console */
/** Сравнява PUBLIC VAPID ключа в живия prod bundle с валидния локален.
 *  PUBLIC ключът НЕ е secret — вграден в браузърния bundle по дизайн (Next вгражда
 *  NEXT_PUBLIC_* при BUILD). Цел: subscribe AbortError = невалиден applicationServerKey
 *  → проверяваме дали prod bundle носи ВАЛИДНИЯ public ключ. */
import "./load-env";

const ORIGIN = "https://www.euphoriabeauty.eu";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36";
const LOCAL = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || "";

async function get(u: string): Promise<string | null> {
  try {
    const r = await fetch(u, { headers: { "User-Agent": UA, Accept: "*/*" } });
    return r.ok ? await r.text() : null;
  } catch {
    return null;
  }
}

async function main() {
  console.log("Валиден локален public:", LOCAL, `(${LOCAL.length} знака)\n`);

  const home = await get(ORIGIN + "/");
  if (!home) {
    console.log("✗ Не успях да дръпна сайта.");
    return;
  }
  const chunks = new Set<string>();
  const collect = (html: string) => {
    for (const m of html.matchAll(/\/_next\/static\/chunks\/[^"'\s)]+?\.js/g)) chunks.add(m[0]);
  };
  collect(home);
  for (const p of ["/staff", "/staff/profile", "/staff/login"]) {
    const h = await get(ORIGIN + p);
    if (h) collect(h);
  }
  // buildId сегменти → manifest-и → всички chunks (вкл. auth-route lazy chunks; JS асетите са публични).
  const segs = new Set<string>();
  for (const m of home.matchAll(/\/_next\/static\/([\w-]{6,})\//g)) if (!["chunks", "css", "media"].includes(m[1])) segs.add(m[1]);
  for (const id of segs) {
    for (const name of ["_buildManifest.js", "_app-build-manifest.js", "_ssgManifest.js"]) {
      const man = await get(`${ORIGIN}/_next/static/${id}/${name}`);
      if (man) for (const m of man.matchAll(/static\/chunks\/[^"'\s)]+?\.js/g)) chunks.add("/_next/" + m[0]);
    }
  }

  console.log(`Сканирам ${chunks.size} chunk-а за 87-знакови (B…) ключове...`);
  const found = new Set<string>();
  let scanned = 0;
  for (const c of chunks) {
    if (scanned >= 250) break;
    const js = await get(ORIGIN + c);
    scanned++;
    if (!js) continue;
    for (const m of js.matchAll(/B[A-Za-z0-9_-]{86}/g)) found.add(m[0]);
  }

  console.log(`\nНамерени ключове в prod (${found.size}):`);
  for (const k of found) console.log("  ", k, k === LOCAL ? "✅ == валидния" : "❌ ДРУГ");
  if (!found.size) console.log("  (никакви — ключът е в lazy chunk; пробвай browser конзола на /staff/profile)");
  else if (!found.has(LOCAL)) console.log("\n❌ ВАЛИДНИЯТ public ключ НЕ е в prod bundle → prod има ГРЕШЕН NEXT_PUBLIC_VAPID_PUBLIC_KEY. Това е причината за subscribe AbortError.");
  else console.log("\n✅ Валидният public ключ Е в prod — subscribe проблемът е другаде (виж устройство/SW).");
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
