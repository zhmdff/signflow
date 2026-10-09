import type { AiStatus, Usage } from "@/lib/types";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-flash-latest";

export type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

/** Subset of the OpenAPI schema that Gemini accepts as `responseSchema`. */
export type Schema = {
  type: "OBJECT" | "ARRAY" | "STRING" | "INTEGER" | "NUMBER" | "BOOLEAN";
  description?: string;
  nullable?: boolean;
  enum?: readonly string[];
  items?: Schema;
  properties?: Record<string, Schema>;
  required?: string[];
};

export class AiError extends Error {
  constructor(
    message: string,
    public status = 502,
    public code = "ai_error",
  ) {
    super(message);
  }
}

export function aiStatus(): AiStatus {
  return {
    configured: Boolean(process.env.GEMINI_API_KEY),
    model: process.env.GEMINI_MODEL || DEFAULT_MODEL,
  };
}

export const emptyUsage = (): Usage => ({ promptTokens: 0, outputTokens: 0, calls: 0 });

export function addUsage(a: Usage, b: Usage): Usage {
  return {
    promptTokens: a.promptTokens + b.promptTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    calls: a.calls + b.calls,
  };
}

const RETRYABLE = new Set([429, 500, 503]);

/**
 * The one entry point to Gemini. Every call returns JSON matching `schema`,
 * plus the token counts used for cost measurement.
 */
export async function callGemini<T>(
  prompt: string | GeminiPart[],
  schema: Schema,
  opts: { system?: string; temperature?: number } = {},
): Promise<{ data: T; usage: Usage }> {
  const { configured, model } = aiStatus();
  if (!configured) {
    throw new AiError(
      "GEMINI_API_KEY is not set. Add it to .env.local and restart the dev server.",
      503,
      "no_key",
    );
  }

  const body = {
    ...(opts.system ? { systemInstruction: { parts: [{ text: opts.system }] } } : {}),
    contents: [{ role: "user", parts: typeof prompt === "string" ? [{ text: prompt }] : prompt }],
    generationConfig: {
      temperature: opts.temperature ?? 0.1,
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  };

  let res: Response | undefined;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      res = await fetch(`${ENDPOINT}/${model}:generateContent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY!,
        },
        body: JSON.stringify(body),
      });
    } catch {
      throw new AiError("Could not reach the Gemini API. Check your network connection.");
    }
    if (!RETRYABLE.has(res.status)) break;
    await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
  }

  if (!res || !res.ok) {
    const detail = await res
      ?.json()
      .then((j) => j?.error?.message as string | undefined)
      .catch(() => undefined);
    const status = res?.status ?? 502;
    throw new AiError(
      `Gemini request failed (${status})${detail ? `: ${detail}` : ""}`,
      status === 429 ? 429 : 502,
    );
  }

  const json = await res.json();
  const text: string = (json.candidates?.[0]?.content?.parts ?? [])
    .map((p: { text?: string }) => p.text ?? "")
    .join("");
  if (!text) {
    const reason = json.candidates?.[0]?.finishReason ?? json.promptFeedback?.blockReason;
    throw new AiError(`Gemini returned no content${reason ? ` (${reason})` : ""}.`);
  }

  let data: T;
  try {
    data = JSON.parse(text) as T;
  } catch {
    throw new AiError("Gemini returned malformed JSON. Try again.");
  }

  return {
    data,
    usage: {
      promptTokens: json.usageMetadata?.promptTokenCount ?? 0,
      outputTokens:
        (json.usageMetadata?.candidatesTokenCount ?? 0) +
        (json.usageMetadata?.thoughtsTokenCount ?? 0),
      calls: 1,
    },
  };
}
