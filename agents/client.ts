/**
 * Parity model client — OpenRouter (OpenAI-compatible chat completions).
 *
 * Default model is the free `openai/gpt-oss-120b`; override with PARITY_MODEL.
 * Output cap via PARITY_MAX_TOKENS (the developer roles emit a whole app as
 * JSON — keep headroom; mock mode is the fallback if a free-tier gen truncates).
 */
const BASE_URL = process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";
const MODEL = process.env.PARITY_MODEL ?? "openai/gpt-oss-120b:free";
const MAX_TOKENS = Number(process.env.PARITY_MAX_TOKENS ?? 8000);

function apiKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error(
      "OPENROUTER_API_KEY missing — add it to .env, or run with --mock to use golden fixtures.",
    );
  }
  return key;
}

interface ChatResponse {
  choices?: { message?: { content?: string } }[];
  error?: { message?: string };
}

export async function callRole(system: string, instruction: string): Promise<string> {
  const body = JSON.stringify({
    model: MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: instruction },
    ],
    max_tokens: MAX_TOKENS,
  });

  const ATTEMPTS = 5;
  let lastErr = "";
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        "Content-Type": "application/json",
        "X-Title": "Parity",
      },
      body,
    });

    if (res.status === 429 || res.status >= 500) {
      lastErr = `HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`;
    } else {
      const json = (await res.json()) as ChatResponse;
      if (!res.ok || json.error) {
        // Free-tier providers intermittently return errors — retry with backoff.
        lastErr = json.error?.message ?? `HTTP ${res.status}`;
      } else {
        const content = json.choices?.[0]?.message?.content;
        if (content) return content;
        lastErr = "empty completion";
      }
    }
    await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
  }
  throw new Error(`OpenRouter failed after ${ATTEMPTS} attempts — ${lastErr}`);
}

/** Pull the first balanced JSON object/array out of a model response. */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.search(/[[{]/);
  if (start === -1) throw new Error("no JSON found in model response");
  const open = raw[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < raw.length; i++) {
    const c = raw[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) return JSON.parse(raw.slice(start, i + 1));
    }
  }
  throw new Error("unbalanced JSON in model response");
}
