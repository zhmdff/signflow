"use client";

import { useRef, useState, type DragEvent, type FormEvent } from "react";
import { useUpload } from "@/hooks/use-contracts";
import { cn, KIND_LABEL } from "@/lib/format";
import type { Contract, ContractKind } from "@/lib/types";
import { Button } from "./ui/button";
import { Icon } from "./ui/icons";
import { ErrorNote, Spinner } from "./ui/states";
import { Tabs, type TabItem } from "./ui/tabs";

const KINDS: ContractKind[] = ["partner", "employee", "own_terms"];
type Mode = "file" | "text";
const MODES: TabItem<Mode>[] = [
  { value: "file", label: "Upload a file" },
  { value: "text", label: "Paste text" },
];

/** Sends a PDF, text file or pasted text to ingest, which stores it as clauses with ids. */
export function UploadPanel({
  defaultKind = "partner",
  lockKind = false,
  onUploaded,
}: {
  defaultKind?: ContractKind;
  /** Hide the type picker when the page only makes sense for one kind. */
  lockKind?: boolean;
  onUploaded?: (contract: Contract) => void;
}) {
  const { upload, uploading, error, clearError, lastUpload } = useUpload();
  const [mode, setMode] = useState<Mode>("file");
  const [kind, setKind] = useState<ContractKind>(defaultKind);
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const ready = mode === "file" ? file !== null : text.trim().length >= 40;

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) {
      setFile(dropped);
      clearError();
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!ready || uploading) return;
    const contract = await upload(mode === "file" ? { file: file!, kind } : { text, kind });
    if (contract) {
      setFile(null);
      setText("");
      if (input.current) input.current.value = "";
      onUploaded?.(contract);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs label="Upload method" items={MODES} value={mode} onChange={setMode} />
          {!lockKind && (
            <label className="flex items-center gap-2 text-[13px] text-muted">
              Type
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as ContractKind)}
                className="h-8 rounded-md border border-line bg-surface px-2 text-[13px] text-ink focus-visible:outline-2 focus-visible:outline-accent"
              >
                {KINDS.map((k) => (
                  <option key={k} value={k}>
                    {KIND_LABEL[k]}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {mode === "file" ? (
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cn(
              "flex cursor-pointer flex-col items-center gap-1 rounded-md border border-dashed px-4 py-7 text-center transition-colors",
              "focus-within:outline-2 focus-within:outline-accent",
              dragging ? "border-accent bg-accent-soft" : "border-line hover:border-ink/40",
            )}
          >
            <Icon name="upload" className="size-5 text-muted" />
            <span className="text-sm font-medium">{file ? file.name : "Drop a contract here, or choose a file"}</span>
            <span className="text-xs text-muted">PDF or plain text, up to 10 MB</span>
            <input
              ref={input}
              type="file"
              accept=".pdf,.txt,.md,application/pdf,text/plain"
              className="sr-only"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                clearError();
              }}
            />
          </label>
        ) : (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={7}
            aria-label="Contract text"
            placeholder="Paste the full contract text here."
            className="w-full resize-y rounded-md border border-line bg-paper px-3 py-2.5 font-mono text-[13px] leading-relaxed placeholder:text-muted focus-visible:outline-2 focus-visible:outline-accent"
          />
        )}

        {error && <ErrorNote>{error}</ErrorNote>}

        {lastUpload && !uploading && !error && (
          <p className="flex items-start gap-1.5 text-sm text-minor">
            <Icon name="check" className="mt-0.5 size-4 shrink-0" />
            <span>
              Added {lastUpload.contract.counterparty}: {lastUpload.contract.clauses.length} clauses,{" "}
              {lastUpload.splitBy === "code" ? "split in code" : "split by the model"},{" "}
              {(lastUpload.usage.promptTokens + lastUpload.usage.outputTokens).toLocaleString("en")} tokens.
            </span>
          </p>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={!ready || uploading}>
            {uploading ? <Spinner /> : <Icon name="upload" />}
            {uploading ? "Reading clauses" : "Extract clauses"}
          </Button>
          <span className="text-xs text-muted">
            {uploading
              ? "Gemini is splitting the contract into clauses. This takes a few seconds."
              : "Stored as clauses with ids, so every answer can cite them."}
          </span>
        </div>
    </form>
  );
}
