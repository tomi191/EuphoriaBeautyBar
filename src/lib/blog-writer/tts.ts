/**
 * Озвучаване на блог статия през Microsoft Edge TTS.
 *
 * Edge TTS reverse-engineer-ва Read-Aloud endpoint-а, който Microsoft Edge
 * ползва за безплатен, неограничен синтез. Същите Azure Neural гласове като
 * платения Azure Speech; без API ключ, без квота — само по един WebSocket
 * на заявка.
 *
 * Компромис спрямо официалния Azure Speech:
 *   + Наистина безплатно, без регистрация, без metering.
 *   - Неофициално — Microsoft може да го счупи/throttle-не без предупреждение.
 *     Fallback: смяна на SDK-то с `microsoft-cognitiveservices-speech-sdk`
 *     към собствен Azure ресурс (free tier 500k символа/месец).
 *
 * Глас (български): bg-BG-KalinaNeural (топъл женски, default за български
 * neural TTS). Алтернатива: bg-BG-BorislavNeural (мъжки).
 *
 * Входът тук НЕ е markdown, а typed BlogBlock[] (форматът на content_json в
 * Euphoria). Извличаме чистия текст от блоковете (виж blocksToSpeakableText),
 * така че говорителят чете прозата, не URL-и или alt текстове на снимки.
 */

import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { createClient } from "@supabase/supabase-js";
import type { BlogBlock } from "@/lib/data/blog";

const BUCKET = "blog-audio";

/** Български женски глас по подразбиране. */
const VOICE = "bg-BG-KalinaNeural";

/** Inline markdown маркери в текста на блок (линкове/удебеляване) → чист текст. */
function stripInlineMarkdown(text: string): string {
  return (
    text
      // Линкове [текст](url) → текст (URL-ът не бива да се чете на глас).
      .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
      // Удебеляване/курсив маркери.
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/__([^_]+)__/g, "$1")
      .replace(/_([^_]+)_/g, "$1")
      // Предпазна мрежа — всеки оцелял bare URL.
      .replace(/https?:\/\/\S+/g, "")
      .replace(/[ \t]+/g, " ")
      .trim()
  );
}

/**
 * Извлича говоримия текст от typed блоковете на статията. Конкатенира
 * заглавието и всички текстови блокове (p/h2/h3/list/quote/callout) с празни
 * редове, така че prepareSpeech() после да сложи пауза след всеки.
 *
 * Пропуска изцяло `image` блоковете — alt текстът е за screen reader-и/SEO,
 * не за глас (би прозвучал като откъсната подсказка насред разказа).
 */
export function blocksToSpeakableText(title: string, blocks: BlogBlock[]): string {
  const parts: string[] = [];
  if (title.trim()) parts.push(stripInlineMarkdown(title));

  for (const block of blocks) {
    switch (block.type) {
      case "p":
      case "h2":
      case "h3":
        if (block.text.trim()) parts.push(stripInlineMarkdown(block.text));
        break;
      case "quote": {
        const q = stripInlineMarkdown(block.text);
        if (q) parts.push(block.author ? `${q} ${stripInlineMarkdown(block.author)}.` : q);
        break;
      }
      case "list":
        for (const item of block.items) {
          const li = stripInlineMarkdown(item);
          if (li) parts.push(li);
        }
        break;
      case "callout": {
        const t = stripInlineMarkdown(block.title);
        const body = stripInlineMarkdown(block.text);
        if (t || body) parts.push([t, body].filter(Boolean).join(". "));
        break;
      }
      case "image":
        // Умишлено пропуснат — alt не се чете на глас.
        break;
    }
  }

  return parts
    .filter(Boolean)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Подготвя текста за neural гласа, за да не препуска в равен монотон
 * ("роботски" ефект).
 *
 * Защо НЕ SSML <break> тагове: reverse-engineer-натият Edge Read-Aloud
 * endpoint, който msedge-tts кара, ТИХО отхвърля <break/> — връща 0 байта
 * аудио (емпирично проверено; `rate` работи, `<break>` не). Затова паузите
 * идват по единствения начин, който този endpoint преживява:
 *   1. Редове без крайна пунктуация получават точка, та гласът да направи
 *      пауза вместо да слее заглавието със следващото изречение.
 *   2. Леко под-1.0 prosody rate (виж SPEECH_RATE) дава по-спокойно темпо.
 *
 * Текстът се и XML-escape-ва, защото msedge-tts го инжектира дословно в своя
 * `<prosody>${input}</prosody>` шаблон без собствено escape-ване — случаен
 * `&`, `<` или `>` би направил SSML-а невалиден и пак би върнал 0 байта.
 */
function prepareSpeech(text: string): string {
  const withStops = text
    .split("\n")
    .map((line) => {
      const t = line.trim();
      if (!t) return "";
      // Вече завършва със изреченска пунктуация? оставяме. Иначе добавяме
      // точка, та заглавие като "Какво е балаяж" да получи пауза след себе си.
      return /[.!?:;…]$/.test(t) ? t : `${t}.`;
    })
    .filter(Boolean)
    .join("\n");

  return withStops
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Prosody rate (множител) — 0.94 = ~6% по-бавно, по-спокойно темпо. */
const SPEECH_RATE = 0.94;

/**
 * Fallback splitter за тела, твърде големи за един WebSocket payload.
 * Single-shot синтезът е за предпочитане (без MP3-boundary глитчове, един
 * непрекъснат prosody контур); това се включва само за много дълги статии.
 * Разделя на параграфни граници, та евентуалният concat шев да падне на
 * естествена пауза, а не насред изречение.
 */
function chunkText(text: string, max = 5000): string[] {
  if (text.length <= max) return [text];
  const out: string[] = [];
  const paras = text.split(/\n{2,}/);
  let buf = "";
  for (const p of paras) {
    if ((buf + "\n\n" + p).length > max && buf.length > 0) {
      out.push(buf);
      buf = p;
    } else {
      buf = buf.length === 0 ? p : `${buf}\n\n${p}`;
    }
  }
  if (buf.length > 0) out.push(buf);
  return out;
}

/**
 * Синтезира един текстов фрагмент до MP3 buffer. `text` трябва вече да е
 * минал през prepareSpeech() (XML-escape-нат, с точки след заглавията).
 * Prosody rate се подава през ProsodyOptions, които този endpoint зачита.
 */
async function synthesizeChunk(voice: string, text: string): Promise<Buffer> {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  const { audioStream } = await tts.toStream(text, { rate: SPEECH_RATE });
  return await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    audioStream.on("data", (c: Buffer) => chunks.push(c));
    audioStream.on("end", () => resolve(Buffer.concat(chunks)));
    audioStream.on("error", (err: Error) => reject(err));
  });
}

export interface BlogAudioResult {
  url: string;
  bytes: number;
}

/**
 * Рендира статията (title + content блокове) до MP3 през Edge TTS, качва в
 * публичния Storage bucket `blog-audio` и връща публичния URL. Извикващият
 * записва URL-а в `blog_posts.audio_url`.
 *
 * При регенерация презаписваме същото име на обект (posts/<slug>.mp3), та
 * публичният URL да е стабилен; cache хедърите се грижат за свежестта.
 *
 * Хвърля при липсващи Supabase env vars или празен текст — извикващият го
 * обвива в try/catch (като cover-а), та провалът да не чупи поста.
 */
export async function generateBlogAudio(
  slug: string,
  title: string,
  blocks: BlogBlock[],
): Promise<BlogAudioResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      "TTS пропуснат — NEXT_PUBLIC_SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY липсват",
    );
  }

  const speakable = blocksToSpeakableText(title, blocks);
  if (speakable.length === 0) {
    throw new Error("Съдържанието е празно след извличане на текста");
  }

  // Single синтез за типичните статии: без MP3-boundary глитчове и един
  // непрекъснат prosody контур. Fallback към chunking само за тела на ръба на
  // WebSocket payload лимита; тогава разделяме на параграфни граници.
  const MAX_SINGLE = 5000;
  let mp3: Buffer;
  if (speakable.length <= MAX_SINGLE) {
    mp3 = await synthesizeChunk(VOICE, prepareSpeech(speakable));
  } else {
    const chunks = chunkText(speakable, MAX_SINGLE);
    const mp3s: Buffer[] = [];
    // Серийно, не Promise.all — пазим прозодичния ред и не отваряме N
    // едновременни WebSocket-а към неофициалния endpoint.
    for (const chunk of chunks) {
      mp3s.push(await synthesizeChunk(VOICE, prepareSpeech(chunk)));
    }
    mp3 = Buffer.concat(mp3s);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const objectPath = `posts/${slug}.mp3`;
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(objectPath, mp3, {
      contentType: "audio/mpeg",
      // Supabase сам слага "public, max-age=" отпред — подаваме САМО секундите
      // (30 дни). Подаване на пълната директива дава malformed двоен хедър.
      cacheControl: "2592000",
      upsert: true,
    });
  if (upErr) {
    throw new Error(
      `Качването на аудиото се провали: ${upErr.message}. Увери се, че bucket "${BUCKET}" съществува и е public.`,
    );
  }

  const url = `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${objectPath}`;
  return { url, bytes: mp3.length };
}
