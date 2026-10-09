import type {
  AiStatus,
  AskResult,
  CompareResult,
  Contract,
  ContractKind,
  LawScanResult,
  Usage,
} from "@/lib/types";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, init);
  } catch {
    throw new ApiError("Could not reach the server.", 0);
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(body?.error ?? `Request failed (${res.status}).`, res.status, body?.code);
  }
  return body as T;
}

const postJson = <T>(path: string, body: unknown) =>
  request<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

export type UploadInput = { file?: File; text?: string; kind?: ContractKind };

export const api = {
  status: () => request<AiStatus>("/api/status"),

  contracts: () => request<{ contracts: Contract[] }>("/api/contracts").then((r) => r.contracts),

  upload: ({ file, text, kind }: UploadInput) => {
    const form = new FormData();
    if (file) form.set("file", file);
    if (text) form.set("text", text);
    if (kind) form.set("kind", kind);
    return request<{ contract: Contract; usage: Usage }>("/api/contracts", { method: "POST", body: form });
  },

  removeContract: (id: string) =>
    request<{ ok: true }>(`/api/contracts/${encodeURIComponent(id)}`, { method: "DELETE" }),

  compare: (contractId: string, force = false) =>
    postJson<CompareResult>("/api/compare", { contractId, force }),

  lawScan: (lawText: string, force = false) => postJson<LawScanResult>("/api/law-scan", { lawText, force }),

  ask: (question: string, history: { role: "user" | "assistant"; text: string }[], contractId: string | null) =>
    postJson<AskResult>("/api/ask", { question, history, contractId }),
};

export const errorMessage = (err: unknown) =>
  err instanceof Error ? err.message : "Something went wrong.";
