import { AiError, parseModelJson, postJson, readKeys, type CallOptions, type CallResult, type Part, type Schema } from "./ai-shared";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

export const geminiConfig = () => ({
  keys: readKeys(process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEYS),
  model: process.env.GEMINI_MODEL || "gemini-flash-latest",
});

/** The primary provider. `attempts` is lowered when another key or model is waiting, so failover is quick. */
export async function callGemini<T>(
  key: string,
  parts: Part[],
  schema: Schema,
  opts: CallOptions,
  attempts: number,
): Promise<CallResult<T>> {
  const { model } = geminiConfig();

  const json = await postJson(
    "Gemini",
    `${ENDPOINT}/${model}:generateContent`,
    { "x-goog-api-key": key },
    {
      ...(opts.system ? { systemInstruction: { parts: [{ text: opts.system }] } } : {}),
      contents: [{ role: "user", parts }],
      generationConfig: {
        temperature: opts.temperature ?? 0.1,
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    },
    attempts,
  );

  const text: string = (json.candidates?.[0]?.content?.parts ?? [])
    .map((p: { text?: string }) => p.text ?? "")
    .join("");
  if (!text) {
    const reason = json.candidates?.[0]?.finishReason ?? json.promptFeedback?.blockReason;
    throw new AiError(`Gemini returned no content${reason ? ` (${reason})` : ""}.`);
  }

  return {
    data: parseModelJson<T>("Gemini", text),
    usage: {
      promptTokens: json.usageMetadata?.promptTokenCount ?? 0,
      outputTokens:
        (json.usageMetadata?.candidatesTokenCount ?? 0) + (json.usageMetadata?.thoughtsTokenCount ?? 0),
      calls: 1,
      model,
    },
  };
}
