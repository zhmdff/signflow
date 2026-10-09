import { connection } from "next/server";
import { ingestContract, type IngestInput } from "@/lib/server/ingest";
import { HttpError, respond } from "@/lib/server/respond";
import { listContracts } from "@/lib/server/store";
import type { ContractKind } from "@/lib/types";

const KINDS: ContractKind[] = ["own_terms", "employee", "partner"];
const MAX_FILE_BYTES = 10 * 1024 * 1024;

export async function GET() {
  await connection();
  return respond(async () => ({ contracts: await listContracts() }));
}

/** Ingest: multipart form with `file` (PDF or text) or `text`, and an optional `kind`. */
export async function POST(request: Request) {
  return respond(async () => {
    const form = await request.formData().catch(() => {
      throw new HttpError("Expected multipart form data.");
    });

    const rawKind = form.get("kind");
    const kind = KINDS.find((k) => k === rawKind);
    const file = form.get("file");
    const text = form.get("text");

    let input: IngestInput;
    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_FILE_BYTES) throw new HttpError("File is larger than 10 MB.", 413);
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      input = isPdf
        ? {
            file: {
              mimeType: "application/pdf",
              base64: Buffer.from(await file.arrayBuffer()).toString("base64"),
            },
            kind,
          }
        : { text: await file.text(), kind };
    } else if (typeof text === "string" && text.trim().length >= 40) {
      input = { text, kind };
    } else {
      throw new HttpError("Upload a PDF or text file, or paste the contract text.");
    }

    return ingestContract(input);
  });
}
