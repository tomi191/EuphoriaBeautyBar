/**
 * Journey: бот API договор срещу PRODUCTION.
 * Праща реални въпроси към /api/bot и проверява интент/линкове/текст.
 * Пускане: node scripts/journey-bot.mjs
 */
const BASE = process.env.BASE_URL ?? "https://www.euphoriabeauty.eu";

const CASES = [
  { q: "Здравей!", intent: "greeting" },
  { q: "балеаж цена", intent: "service", link: "/uslugi/balayazh-varna" },
  { q: "кола маска цели крака", intent: "service", link: "/uslugi/kola-maska-varna" },
  { q: "работно време", intent: "hours", text: "09:00" },
  { q: "къде се намирате", intent: "location", text: "Петър Райчев" },
  { q: "работа при вас", intent: "careers", link: "/karieri" },
  { q: "искам да говоря с човек", intent: "contact", link: "tel:" },
  { q: "xyz нищо общо", intent: "fallback" },
];

let pass = 0;
let fail = 0;
for (const c of CASES) {
  try {
    const res = await fetch(`${BASE}/api/bot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: c.q }),
    });
    const body = await res.json();
    const okStatus = res.status === 200;
    const okIntent = body.intent === c.intent;
    const okLink = !c.link || (body.links ?? []).some((l) => l.href.includes(c.link));
    const okText = !c.text || (body.text ?? "").includes(c.text);
    const ok = okStatus && okIntent && okLink && okText;
    ok ? pass++ : fail++;
    console.log(`${ok ? "✅" : "❌"} „${c.q}" → ${res.status} ${body.intent}`);
    if (!ok) console.log(`   ↳ очакван: ${c.intent}${c.link ? ` + линк ${c.link}` : ""} | получено:`, JSON.stringify(body).slice(0, 200));
  } catch (e) {
    fail++;
    console.log(`❌ „${c.q}" → ГРЕШКА: ${e.message}`);
  }
}
console.log(`\n${pass}/${CASES.length} минаха`);
process.exit(fail === 0 ? 0 : 1);
