import type { TermsInput } from "@/lib/terms";
import type {
  AiStatus,
  ChatMessage,
  CompareResult,
  Contract,
  ContractKind,
  LawScanResult,
  LawScanSummary,
  Usage,
  UsageSummary,
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

const send = <T>(method: "POST" | "PUT", path: string, body: unknown) =>
  request<T>(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const id = encodeURIComponent;

export type UploadInput = { file?: File; text?: string; kind?: ContractKind };
export type UploadResult = { contract: Contract; usage: Usage; splitBy: "code" | "model" };

export const api = {
  status: () => request<AiStatus>("/api/status"),
  usage: () => request<UsageSummary>("/api/usage"),

  contracts: () => request<{ contracts: Contract[] }>("/api/contracts").then((r) => r.contracts),

  upload: ({ file, text, kind }: UploadInput) => {
    const form = new FormData();
    if (file) form.set("file", file);
    if (text) form.set("text", text);
    if (kind) form.set("kind", kind);
    return request<UploadResult>("/api/contracts", { method: "POST", body: form });
  },

  removeContract: (contractId: string) =>
    request<{ ok: true }>(`/api/contracts/${id(contractId)}`, { method: "DELETE" }),

  saveTerms: (input: TermsInput) =>
    send<{ contract: Contract }>("PUT", "/api/terms", input).then((r) => r.contract),

  /** The stored comparison, if one exists. Costs nothing. */
  savedComparison: (contractId: string) =>
    request<{ result: CompareResult | null }>(`/api/contracts/${id(contractId)}/comparison`).then((r) => r.result),

  compare: (contractId: string, force = false) =>
    send<{ result: CompareResult }>("POST", `/api/contracts/${id(contractId)}/comparison`, { force }).then(
      (r) => r.result,
    ),

  lawScans: () => request<{ scans: LawScanSummary[] }>("/api/law-scans").then((r) => r.scans),

  lawScan: (scanId: string) =>
    request<{ lawText: string; result: LawScanResult }>(`/api/law-scans/${id(scanId)}`),

  runLawScan: (lawText: string, force = false) =>
    send<{ result: LawScanResult }>("POST", "/api/law-scans", { lawText, force }).then((r) => r.result),

  removeLawScan: (scanId: string) =>
    request<{ ok: true }>(`/api/law-scans/${id(scanId)}`, { method: "DELETE" }),

  chat: () => request<{ messages: ChatMessage[] }>("/api/chat").then((r) => r.messages),

  /** Returns the stored question and its answer. The server keeps the conversation. */
  ask: (question: string, contractId: string | null) =>
    send<{ messages: ChatMessage[] }>("POST", "/api/chat", { question, contractId }).then((r) => r.messages),

  clearChat: () => request<{ ok: true }>("/api/chat", { method: "DELETE" }),
};

export const errorMessage = (err: unknown) =>
  err instanceof Error ? err.message : "Something went wrong.";
