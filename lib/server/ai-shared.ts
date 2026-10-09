import type { Usage } from "@/lib/types";
import type { Feature } from "./usage";

export type Part = { text: string } | { inlineData: { mimeType: string; data: string } };

/** Response schema, written in the OpenAPI subset Gemini accepts. Converted for other providers. */
export type Schema = {
  type: "OBJECT" | "ARRAY" | "STRING" | "INTEGER" | "NUMBER" | "BOOLEAN";
  description?: string;
  nullable?: boolean;
  enum?: readonly string[];
  items?: Schema;
  properties?: Record<string, Schema>;
  required?: string[];
};

export type CallOptions = {
  /** What the call is for; token usage is logged under it. */
  feature: Feature;
  system?: string;
  temperature?: number;
};
export type CallResult<T> = { data: T; usage: Usage };

export class AiError extends Error {
  constructor(
    message: string,
    public status = 502,
    public code = "ai_error",
  ) {
    super(message);
  }
}

/**
 * Keys for one provider: the single-key variable first, then a comma-separated
 * list. Duplicates and blanks are dropped.
 */
export function readKeys(single: string | undefined, list: string | undefined): string[] {
  const keys = [single ?? "", ...(list ?? "").split(",")].map((k) => k.trim()).filter(Boolean);
  return [...new Set(keys)];
}

/** A provider's raw response body. Each provider reads its own fields defensively. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RawResponse = Record<string, any>;

const RETRYABLE = new Set([429, 500, 503]);

/** The longest a request waits for a rate limit to clear before giving up. */
const MAX_WAIT_SECONDS = 30;

/**
 * How long the provider says to wait, in seconds. Groq sends a retry-after
 * header for its per-minute limit; a daily quota comes back as hours.
 */
function retryAfterSeconds(res: Response): number | null {
  const header = Number(res.headers.get("retry-after"));
  return Number.isFinite(header) && header > 0 ? header : null;
}

/**
 * POSTs JSON. Waits out short rate limits and retries server errors, but fails
 * at once when the wait would be long, so a backup model can take over.
 */
export async function postJson(
  provider: string,
  url: string,
  headers: Record<string, string>,
  body: unknown,
  attempts = 3,
): Promise<RawResponse> {
  let res: Response | undefined;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(body),
      });
    } catch {
      throw new AiError(`Could not reach the ${provider} API. Check your network connection.`);
    }
    if (!RETRYABLE.has(res.status) || attempt === attempts - 1) break;
    const wait = retryAfterSeconds(res) ?? 1.2 * (attempt + 1);
    if (wait > MAX_WAIT_SECONDS) break;
    await new Promise((r) => setTimeout(r, (wait + 0.5) * 1000));
  }

  if (!res || !res.ok) {
    const error: RawResponse | undefined = await res
      ?.json()
      .then((j) => j?.error)
      .catch(() => undefined);
    const status = res?.status ?? 502;
    if (error?.failed_generation) {
      console.warn(`${provider} output that failed validation: ${String(error.failed_generation).slice(0, 600)}`);
    }
    throw new AiError(
      `${provider} request failed (${status})${error?.message ? `: ${error.message}` : ""}`,
      status === 429 ? 429 : 502,
      typeof error?.code === "string" ? error.code : "ai_error",
    );
  }
  return res.json();
}

export function parseModelJson<T>(provider: string, text: string): T {
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new AiError(`${provider} returned malformed JSON. Try again.`);
  }
}
