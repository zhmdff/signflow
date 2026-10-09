import type { AiStatus, Usage } from "@/lib/types";
import { AiError, type CallOptions, type CallResult, type Part, type Schema } from "./ai-shared";
import { callGemini, geminiConfig } from "./gemini";
import { callGroq, groqConfig } from "./groq";
import { logUsage } from "./usage";

type Provider = "gemini" | "groq";
/** One key that can answer a call. Calls fall through targets in order. */
type Target = { provider: Provider; key: string; label: string };

/** Gemini keys first, then Groq keys, each in the order they are configured. */
function targets(): Target[] {
  const list = (provider: Provider, name: string, keys: string[]): Target[] =>
    keys.map((key, i) => ({ provider, key, label: keys.length > 1 ? `${name} key ${i + 1}` : name }));
  return [...list("gemini", "Gemini", geminiConfig().keys), ...list("groq", "Groq", groqConfig().keys)];
}

export function aiStatus(): AiStatus {
  const gemini = geminiConfig();
  const groq = groqConfig();
  const hasGemini = gemini.keys.length > 0;
  const hasGroq = groq.keys.length > 0;
  return {
    configured: hasGemini || hasGroq,
    model: hasGemini ? gemini.model : groq.model,
    backupModel: hasGemini && hasGroq ? groq.model : null,
    keyCount: gemini.keys.length + groq.keys.length,
  };
}

export function addUsage(a: Usage, b: Usage): Usage {
  return {
    promptTokens: a.promptTokens + b.promptTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    calls: a.calls + b.calls,
    model: a.model === b.model ? a.model : [a.model, b.model].filter(Boolean).join(" + "),
  };
}

// How long a key is skipped after it fails. Gemini's free quota is per day, Groq's is per minute.
const COOLDOWN_MS = {
  gemini: { rateLimited: 15 * 60_000, failed: 60_000 },
  groq: { rateLimited: 60_000, failed: 60_000 },
};

// Kept on globalThis so it survives dev hot reloads. Maps a key to when it may be tried again.
const g = globalThis as unknown as { __signflowResting?: Map<string, number> };
const resting = (g.__signflowResting ??= new Map());

const reason = (err: unknown) => (err instanceof Error ? err.message : String(err)).split("\n")[0].slice(0, 200);

/**
 * The one entry point to the model. Every call returns JSON matching `schema`,
 * plus token counts. Keys are tried in order: every Gemini key, then every Groq
 * key. A key that fails is rested, so later calls skip it instead of failing on
 * it again.
 */
export async function callModel<T>(
  prompt: string | Part[],
  schema: Schema,
  opts: CallOptions,
): Promise<CallResult<T>> {
  const result = await route<T>(prompt, schema, opts);
  await logUsage(opts.feature, result.usage, false);
  return result;
}

async function route<T>(prompt: string | Part[], schema: Schema, opts: CallOptions): Promise<CallResult<T>> {
  const parts = typeof prompt === "string" ? [{ text: prompt }] : prompt;
  const hasFile = parts.some((p) => "inlineData" in p);

  const all = targets();
  if (all.length === 0) {
    throw new AiError(
      "No AI key is set. Add GEMINI_API_KEY (or GROQ_API_KEY) to .env.local and restart the dev server.",
      503,
      "no_key",
    );
  }

  // Only Gemini can read a PDF.
  const able = hasFile ? all.filter((t) => t.provider === "gemini") : all;
  if (able.length === 0) {
    throw new AiError("The backup model cannot read PDFs. Paste the contract as text instead.", 503, "no_pdf");
  }

  // Skip keys that failed recently, unless that would leave nothing to try.
  const now = Date.now();
  const rested = able.filter((t) => (resting.get(t.key) ?? 0) <= now);
  const queue = rested.length > 0 ? rested : able;

  const failures: string[] = [];
  for (const [i, target] of queue.entries()) {
    // With another key waiting, fail over at once. The last one gets retries and waits out short limits.
    const attempts = i === queue.length - 1 ? 3 : 1;
    try {
      const result =
        target.provider === "gemini"
          ? await callGemini<T>(target.key, parts, schema, opts, attempts)
          : await callGroq<T>(target.key, parts, schema, opts, attempts);
      resting.delete(target.key);
      return result;
    } catch (err) {
      const rateLimited = err instanceof AiError && err.status === 429;
      resting.set(target.key, Date.now() + COOLDOWN_MS[target.provider][rateLimited ? "rateLimited" : "failed"]);
      failures.push(`${target.label}: ${reason(err)}`);
      if (i < queue.length - 1) console.warn(`${target.label} failed, trying ${queue[i + 1].label}. ${reason(err)}`);
    }
  }

  const pdfNote = hasFile && all.length > able.length ? " The backup model cannot read PDFs, so paste the text instead." : "";
  throw new AiError(
    failures.length === 1 ? `${failures[0]}${pdfNote}` : `All ${failures.length} keys failed. ${failures.join(" | ")}${pdfNote}`,
    failures.every((f) => f.includes("(429)")) ? 429 : 502,
  );
}
