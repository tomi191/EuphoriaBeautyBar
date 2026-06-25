/**
 * Снимка за услуга — реалистично изображение според вида.
 * Коса × дължина → length снимки (color/balayage/haircut × short/medium/long);
 * останалите услуги → визуален архетип по група/ключови думи.
 * Услуга без съвпадение → null (без снимка).
 */
export function serviceImageFor(name: string, groupTitle?: string): string | null {
  const n = name.toLowerCase();
  const g = (groupTitle ?? "").toLowerCase();

  // 1. Length варианти (коса × дължина)
  const len = /къса коса/.test(n) ? "short" : /средна коса/.test(n) ? "medium" : /дълга коса/.test(n) ? "long" : null;
  if (len) {
    if (/балаяж|кичури/.test(n)) return `/images/lengths/balayage-${len}.png`;
    if (/подстригване/.test(n)) return `/images/lengths/haircut-${len}.png`;
    if (/боядисване|корекция/.test(n)) return `/images/lengths/color-${len}.png`;
    if (/сешоар/.test(n)) return "/images/services/styling.png";
  }

  // 2. Маникюр / Педикюр — по групата (най-надеждно; имената са двусмислени).
  if (g === "педикюр" || /педикюр|ходила/.test(n)) return "/images/services/pedicure.png";
  if (g === "маникюр" || /маникюр|нокти|под гел|за ръце|snb/.test(n)) return "/images/services/manicure.png";

  // 3. Мигли / вежди (преди козметика catch-all).
  if (/мигли|вежди/.test(n)) return "/images/services/lashesbrows.png";

  // 4. Епилация.
  if (/епилац|½ ръце|цели ръце|½ крака|цели крака|горна устна|подмишници/.test(n)) return "/images/services/waxing.png";

  // 5. Коса (без дължина).
  if (/подстригване/.test(n)) return "/images/lengths/haircut-medium.png";
  if (/боядисване|боя на салон|корекция/.test(n)) return "/images/lengths/color-medium.png";
  if (/балаяж|кичури/.test(n)) return "/images/lengths/balayage-medium.png";
  if (/сешоар|навиване|преса|букли|ретро|вълни|прическа/.test(n)) return "/images/services/styling.png";
  if (/къдрене/.test(n)) return "/images/services/curls.png";
  if (/плитка/.test(n)) return "/images/services/braids.png";
  if (/кератин|ампул|ламеларна|nashi|kerasilk/.test(n)) return "/images/services/hairtreatment.png";

  // 6. Козметика / лице (catch-all за останалите процедури).
  if (
    g === "почистване на лице" || g === "терапии за лице" || g === "японски масаж на лице" || g === "ламиниране" ||
    /лице|почистване|пилинг|лифтинг|хидратац|микронидлинг|мезотерап|detox|oxygen|карбокси|колаген|ретинол|пептид|акне|пигмент|криотерап|масаж|facial|инфузия|плазма|bioplasma|hyalo|retider|ester|alude|goyuki|конци|азелаин|биостимул/.test(n)
  ) return "/images/services/facial.png";

  return null;
}

/** @deprecated — ползвай serviceImageFor. Запазено за съвместимост. */
export const lengthIconFor = (name: string): string | null => serviceImageFor(name);
