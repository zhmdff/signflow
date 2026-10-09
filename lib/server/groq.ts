import { AiError, parseModelJson, postJson, readKeys, type CallOptions, type CallResult, type Part, type Schema } from "./ai-shared";

const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

// Ingest echoes a whole contract back as JSON, so the output needs far more room than the default.
const MAX_OUTPUT_TOKENS = 32_000;

export const groqConfig = () => ({
  keys: readKeys(process.env.GROQ_API_KEY, process.env.GROQ_API_KEYS),
  model: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
});

/** Gemini's schema dialect to standard JSON Schema, in the closed form strict mode requires. */
export function toJsonSchema(schema: Schema): Record<string, unknown> {
  const type = schema.type.toLowerCase();
  const out: Record<string, unknown> = { type: schema.nullable ? [type, "null"] : type };
  if (schema.description) out.description = schema.description;
  if (schema.enum) out.enum = schema.nullable ? [...schema.enum, null] : schema.enum;
  if (schema.items) out.items = toJsonSchema(schema.items);
  if (schema.properties) {
    out.properties = Object.fromEntries(
      Object.entries(schema.properties).map(([key, value]) => [key, toJsonSchema(value)]),
    );
    out.required = Object.keys(schema.properties);
    out.additionalProperties = false;
  }
  return out;
}

/** The backup provider: Groq's OpenAI-compatible API, held to the same response schema. */
export async function callGroq<T>(
  key: string,
  parts: Part[],
  schema: Schema,
  opts: CallOptions,
  attempts: number,
): Promise<CallResult<T>> {
  const { model } = groqConfig();
  if (parts.some((p) => "inlineData" in p)) {
    throw new AiError("The backup model cannot read PDFs. Paste the contract as text instead.", 503, "no_pdf");
  }

  const jsonSchema = toJsonSchema(schema);
  const user = parts.map((p) => ("text" in p ? p.text : "")).join("\n\n");
  const isGptOss = model.startsWith("openai/gpt-oss");

  const request = (system: string | undefined, responseFormat: unknown) =>
    postJson(
      "Groq",
      ENDPOINT,
      { Authorization: `Bearer ${key}` },
      {
        model,
        temperature: opts.temperature ?? 0.1,
        max_completion_tokens: MAX_OUTPUT_TOKENS,
        // Reasoning tokens count against the output budget; these tasks need the room for the answer.
        ...(isGptOss ? { reasoning_effort: "low" } : {}),
        messages: [...(system ? [{ role: "system", content: system }] : []), { role: "user", content: user }],
        response_format: responseFormat,
      },
      attempts,
    );

  let json;
  try {
    // Groq enforces the schema exactly only on the gpt-oss models; others follow it best-effort.
    json = await request(opts.system, {
      type: "json_schema",
      json_schema: { name: "result", schema: jsonSchema, strict: isGptOss },
    });
  } catch (err) {
    if (!(err instanceof AiError) || err.code !== "json_validate_failed") throw err;
    // The model drifted from the schema. Ask again in plain JSON mode with the schema spelled out.
    json = await request(
      `${opts.system ?? ""}\n\nReply with a single JSON object and nothing else. It must match this JSON Schema exactly:\n${JSON.stringify(jsonSchema)}`,
      { type: "json_object" },
    );
  }

  const text: string = json.choices?.[0]?.message?.content ?? "";
  if (!text) throw new AiError("Groq returned no content.");

  return {
    data: parseModelJson<T>("Groq", text),
    usage: {
      promptTokens: json.usage?.prompt_tokens ?? 0,
      outputTokens: json.usage?.completion_tokens ?? 0,
      calls: 1,
      model,
    },
  };
}
