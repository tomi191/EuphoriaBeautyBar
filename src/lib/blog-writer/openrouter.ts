/**
 * Generic OpenRouter chat completion клиент.
 * Пренесен от peptidlabs — native fetch, без SDK зависимости.
 */

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export interface CompletionResult {
  content: string;
  model: string;
  /** OpenAI-style finish reason: "stop" | "length" | "content_filter" | ... */
  finishReason: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface OpenRouterOptions {
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  /** API ключ (от env). */
  apiKey: string;
  /** Модел; default-ва се от извикващия (BLOG_OPENROUTER_MODEL). */
  model: string;
  /** Site URL за HTTP-Referer header. */
  siteUrl: string;
  /** Име на сайта за X-Title header. */
  siteName: string;
  temperature?: number;
  maxTokens?: number;
  /**
   * Принуждаване на валиден JSON обект чрез OpenAI-съвместимия
   * response_format. Default true — главният passing разчита на това.
   */
  json?: boolean;
}

/** Едно non-streaming извикване към OpenRouter. */
export async function complete(opts: OpenRouterOptions): Promise<CompletionResult> {
  const json = opts.json ?? true;

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": opts.siteUrl,
      "X-Title": opts.siteName,
    },
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 12000,
      ...(json ? { response_format: { type: "json_object" as const } } : {}),
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`OpenRouter ${res.status}: ${err.slice(0, 300)}`);
  }

  const data = await res.json();
  return {
    content: data.choices?.[0]?.message?.content ?? "",
    model: data.model ?? opts.model,
    finishReason: data.choices?.[0]?.finish_reason ?? "unknown",
    usage: {
      promptTokens: data.usage?.prompt_tokens ?? 0,
      completionTokens: data.usage?.completion_tokens ?? 0,
      totalTokens: data.usage?.total_tokens ?? 0,
    },
  };
}
