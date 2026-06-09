/**
 * Cyrillic → Latin slug. Пренесен от peptidlabs.
 */
const CYR_TO_LAT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ж: "zh", з: "z",
  и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p",
  р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch",
  ш: "sh", щ: "sht", ъ: "a", ь: "y", ю: "yu", я: "ya",
  А: "A", Б: "B", В: "V", Г: "G", Д: "D", Е: "E", Ж: "Zh", З: "Z",
  И: "I", Й: "Y", К: "K", Л: "L", М: "M", Н: "N", О: "O", П: "P",
  Р: "R", С: "S", Т: "T", У: "U", Ф: "F", Х: "H", Ц: "Ts", Ч: "Ch",
  Ш: "Sh", Щ: "Sht", Ъ: "A", Ь: "Y", Ю: "Yu", Я: "Ya",
};

/** Cyrillic-aware slug — "Кератинова терапия" → "keratinova-terapiya". */
export function generateSlug(title: string, maxLength = 100): string {
  return title
    .split("")
    .map((c) => CYR_TO_LAT[c] ?? c)
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength);
}

export function calculateWordCount(htmlOrMarkdown: string): number {
  const text = htmlOrMarkdown.replace(/<[^>]*>|[#*_`>[\]]/g, " ");
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}

export function calculateReadingTime(text: string, wpm = 200): number {
  return Math.max(1, Math.ceil(calculateWordCount(text) / wpm));
}
