/**
 * IndexNow ping — уведомява Bing/Seznam/Yandex (и Bing Copilot индекса) за нови
 * или променени URL-и веднага, вместо да чакат crawl. Ключът живее в
 * public/<key>.txt (сервира се от домейна — изискване на протокола).
 *
 * Пускане (след deploy на новите страници):
 *   npx tsx scripts/indexnow-ping.ts <url1> <url2> ...
 *   npx tsx scripts/indexnow-ping.ts --all   ← всички URL-и от sitemap-а
 */

const HOST = "www.euphoriabeauty.eu";
const KEY = "90d642f56cdf756eb72a71fbd303691d";
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;

async function urlsFromSitemap(): Promise<string[]> {
  const out: string[] = [];
  const index = await fetch(`https://${HOST}/sitemap.xml`).then((r) => r.text());
  const children = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  for (const child of children) {
    const xml = await fetch(child).then((r) => r.text());
    out.push(...[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
  }
  return out;
}

async function main() {
  const args = process.argv.slice(2);
  const urlList = args.includes("--all") ? await urlsFromSitemap() : args;
  if (urlList.length === 0) {
    console.error("Подай URL-и или --all");
    process.exit(1);
  }

  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList }),
  });
  console.log(`IndexNow → ${res.status} ${res.statusText} (${urlList.length} URL-а)`);
  if (!res.ok) console.log(await res.text());
  process.exit(res.ok ? 0 : 1);
}

main().catch((e) => {
  console.error("✗", e instanceof Error ? e.message : e);
  process.exit(1);
});

// Прави файла модул (иначе top-level main() се сблъсква с други import-less скриптове).
export {};
