"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { AiKeyNotice } from "@/components/ai-key-notice";
import { QuoteBlock } from "@/components/citation";
import { ContractSelect } from "@/components/contract-select";
import { PageHeader } from "@/components/page-header";
import { Badge, ConfidenceLabel } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icons";
import { Spinner } from "@/components/ui/states";
import { useChat } from "@/hooks/use-chat";
import { useContracts } from "@/hooks/use-contracts";
import { cn, contractLabel } from "@/lib/format";
import { SAMPLE_QUESTIONS } from "@/lib/samples";
import type { ChatMessage, Contract } from "@/lib/types";

function AssistantMessage({
  message,
  byId,
}: {
  message: Extract<ChatMessage, { role: "assistant" }>;
  byId: Map<string, Contract>;
}) {
  if (message.error) {
    return (
      <div role="alert" className="flex items-start gap-2 rounded-lg border border-critical/30 bg-critical-soft px-4 py-3 text-sm text-critical">
        <Icon name="alert" className="mt-0.5 size-4 shrink-0" />
        {message.text}
      </div>
    );
  }

  const result = message.result;
  const citations = (result?.citations ?? []).filter((c) => byId.has(c.contractId));

  return (
    <Card className="animate-rise-in p-5">
      {result && (
        <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          {result.found ? <Badge tone="minor">Answered from the contract</Badge> : <Badge tone="major">Not in the contract</Badge>}
          <ConfidenceLabel confidence={result.confidence} />
        </div>
      )}
      <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{message.text}</p>

      {citations.length > 0 && (
        <div className="mt-4 space-y-3 border-t border-line pt-4">
          <div className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">Sources</div>
          {citations.map((c, i) => {
            const contract = byId.get(c.contractId)!;
            return <QuoteBlock key={i} contract={contract} quote={c.quote} label={contractLabel(contract)} />;
          })}
        </div>
      )}

      <p className="mt-4 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-muted">
        <span>AI-assisted. Needs human review.</span>
        {result?.context && (
          <span className="font-mono">
            read {result.context.sent} of {result.context.total} clauses
          </span>
        )}
        {result && (
          <span className="font-mono">
            {result.cached
              ? "from cache, 0 tokens"
              : `${(result.usage.promptTokens + result.usage.outputTokens).toLocaleString("en")} tokens`}
          </span>
        )}
      </p>
    </Card>
  );
}

export function AskView() {
  const { contracts, byId, loading } = useContracts();
  const { messages, pending, scopeId, setScope, send, clear } = useChat();
  const [draft, setDraft] = useState("");
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length > 0) end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, pending]);

  function submit(text: string) {
    if (!text.trim() || pending) return;
    setDraft("");
    void send(text);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    submit(draft);
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit(draft);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Check 03"
        title="Ask a contract"
        actions={
          messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clear} disabled={pending}>
              Clear chat
            </Button>
          )
        }
      >
        Ask in plain language. Every answer cites the clause it rests on, and says so when the contract is silent.
      </PageHeader>

      <AiKeyNotice />

      <div className="space-y-4 pb-44">
        {messages.length === 0 && (
          <div className="rounded-lg border border-dashed border-line px-6 py-8">
            <div className="heading text-lg">Try one of these</div>
            <div className="mt-3 flex flex-col items-start gap-2">
              {SAMPLE_QUESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={pending || loading}
                  onClick={() => submit(q)}
                  className="rounded-md border border-line bg-surface px-3 py-2 text-left text-sm text-ink-soft transition-colors hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="flex justify-end">
              <p className="max-w-[85%] rounded-lg rounded-br-sm bg-accent px-4 py-2.5 text-[15px] whitespace-pre-wrap text-white">
                {m.text}
              </p>
            </div>
          ) : (
            <AssistantMessage key={m.id} message={m} byId={byId} />
          ),
        )}

        {pending && (
          <div className="flex items-center gap-2 text-sm text-muted">
            <Spinner className="text-accent" />
            Reading the clauses
          </div>
        )}
        <div ref={end} />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-paper/95 backdrop-blur lg:left-60">
        <form onSubmit={onSubmit} className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-5 py-3 lg:px-10">
          <div className={cn("flex items-end gap-2 rounded-lg border border-line bg-surface p-2", "focus-within:border-accent")}>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              rows={2}
              aria-label="Your question"
              placeholder="e.g. An employee missed 3 days with the flu. What does her contract say?"
              className="min-h-11 flex-1 resize-none bg-transparent px-2 py-1.5 text-[15px] placeholder:text-muted focus:outline-none"
            />
            <Button type="submit" variant="accent" disabled={pending || !draft.trim()} aria-label="Send question">
              {pending ? <Spinner /> : <Icon name="send" />}
              Ask
            </Button>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2 text-[13px] text-muted">
              <span className="shrink-0">Search in</span>
              <ContractSelect
                id="ask-scope"
                label="Search in"
                compact
                contracts={contracts}
                value={scopeId}
                onChange={setScope}
                allLabel={`All ${contracts.length} contracts`}
                disabled={pending}
              />
            </div>
            <span className="hidden shrink-0 text-xs text-muted sm:block">Enter to send, Shift+Enter for a new line</span>
          </div>
        </form>
      </div>
    </>
  );
}
