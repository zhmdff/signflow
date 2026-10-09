import { scanLaw } from "@/lib/server/law-scan";
import { HttpError, readJson, respond } from "@/lib/server/respond";
import { listContracts } from "@/lib/server/store";

export async function POST(request: Request) {
  return respond(async () => {
    const { lawText, force } = await readJson<{ lawText?: string; force?: boolean }>(request);
    if (!lawText || lawText.trim().length < 40) throw new HttpError("Paste the text of the law to scan.");

    // The company's own template is not a signed contract, so it is not scanned.
    const contracts = (await listContracts()).filter((c) => c.kind !== "own_terms");
    return scanLaw(lawText, contracts, { force });
  });
}
