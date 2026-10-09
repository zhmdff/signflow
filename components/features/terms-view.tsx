"use client";

import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, SectionTitle } from "@/components/ui/card";
import { Icon, type IconName } from "@/components/ui/icons";
import { ErrorNote, LoadingBlock, Spinner } from "@/components/ui/states";
import { useContracts } from "@/hooks/use-contracts";
import { cn } from "@/lib/format";
import { clauseProblems, nextClauseId } from "@/lib/terms";
import type { Clause, Contract } from "@/lib/types";

/** A clause being edited. `key` stays fixed while the rule's number is retyped. */
type DraftClause = Clause & { key: number };
type Draft = { title: string; counterparty: string; clauses: DraftClause[] };

const FIELD =
  "rounded-md border border-line bg-paper px-3 text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-accent";

function toDraft(terms: Contract | null): Draft {
  return {
    title: terms?.title ?? "Standard Terms and Conditions",
    counterparty: terms?.counterparty ?? "",
    clauses: (terms?.clauses ?? []).map((c, i) => ({ ...c, key: i })),
  };
}

/** What gets saved, and what "unsaved changes" is measured against. */
const payload = (draft: Draft) => ({
  title: draft.title.trim(),
  counterparty: draft.counterparty.trim(),
  clauses: draft.clauses.map(({ id, heading, text }) => ({ id: id.trim(), heading: heading.trim(), text: text.trim() })),
});

function IconButton({
  icon,
  label,
  danger,
  ...props
}: { icon: IconName; label: string; danger?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "rounded-md p-1.5 text-muted focus-visible:outline-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-30",
        danger ? "hover:bg-critical-soft hover:text-critical" : "hover:bg-line-soft hover:text-ink",
      )}
      {...props}
    >
      <Icon name={icon} />
    </button>
  );
}

function TermsEditor({ terms }: { terms: Contract | null }) {
  const { saveTerms } = useContracts();
  const [draft, setDraft] = useState(() => toDraft(terms));
  const [saved, setSaved] = useState(() => JSON.stringify(payload(toDraft(terms))));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const nextKey = useRef(draft.clauses.length);
  const newest = useRef<HTMLInputElement>(null);
  const focusNewest = useRef(false);
  // One rule is open for editing at a time; the rest stay as a readable list.
  const [openKey, setOpenKey] = useState<number | null>(null);

  const problems = clauseProblems(draft.clauses);
  const dirty = JSON.stringify(payload(draft)) !== saved;
  const headerMissing = !draft.title.trim() || !draft.counterparty.trim();
  const valid = !headerMissing && draft.clauses.length > 0 && problems.every((p) => p === null);

  // Warn before a reload or tab close throws away edits.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    if (focusNewest.current) {
      focusNewest.current = false;
      newest.current?.focus();
    }
  });

  function change(next: Draft) {
    setDraft(next);
    setJustSaved(false);
    setError(null);
  }

  const patchClause = (key: number, patch: Partial<Clause>) =>
    change({ ...draft, clauses: draft.clauses.map((c) => (c.key === key ? { ...c, ...patch } : c)) });

  function addClause() {
    focusNewest.current = true;
    const key = nextKey.current++;
    setOpenKey(key);
    change({
      ...draft,
      clauses: [...draft.clauses, { key, id: nextClauseId(draft.clauses), heading: "", text: "" }],
    });
  }

  function move(index: number, by: -1 | 1) {
    const clauses = [...draft.clauses];
    [clauses[index], clauses[index + by]] = [clauses[index + by], clauses[index]];
    change({ ...draft, clauses });
  }

  async function save() {
    if (!valid || saving) return;
    setSaving(true);
    const body = payload(draft);
    const failure = await saveTerms(body);
    setSaving(false);
    if (failure) {
      setError(failure);
    } else {
      setSaved(JSON.stringify(body));
      setJustSaved(true);
    }
  }

  return (
    <>
      <PageHeader
        title="Our terms"
        actions={
          <>
            {dirty && (
              <Button variant="ghost" onClick={() => change(toDraft(terms))} disabled={saving}>
                Discard changes
              </Button>
            )}
            <Button onClick={save} disabled={!dirty || !valid || saving}>
              {saving ? <Spinner /> : <Icon name="check" />}
              {saving ? "Saving" : "Save terms"}
            </Button>
          </>
        }
      >
        Your company&apos;s standard position, one rule per clause. Partner contracts are compared against exactly
        what is written here, so keep each rule short and specific.
      </PageHeader>

      <div className="mb-6 min-h-5 text-sm" aria-live="polite">
        {error ? (
          <ErrorNote>{error}</ErrorNote>
        ) : dirty ? (
          <span className="font-medium text-major">
            Unsaved changes.{" "}
            {!valid && (headerMissing ? "Fill in the company name and title." : "Fix the marked rules to save.")}
          </span>
        ) : justSaved ? (
          <span className="inline-flex items-center gap-1 font-medium text-minor">
            <Icon name="check" className="size-3.5" />
            Saved. Earlier comparisons were cleared, so run them again against the new terms.
          </span>
        ) : (
          <span className="text-muted">
            {terms ? "All changes saved." : "No terms yet. Add your company and your first rule."}
          </span>
        )}
      </div>

      <section className="mb-10">
        <SectionTitle>Document</SectionTitle>
        <Card className="grid gap-4 p-5 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">Company</span>
            <input
              value={draft.counterparty}
              onChange={(e) => change({ ...draft, counterparty: e.target.value })}
              placeholder="Your company's legal name"
              className={cn(FIELD, "h-10 w-full text-sm")}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">Title</span>
            <input
              value={draft.title}
              onChange={(e) => change({ ...draft, title: e.target.value })}
              placeholder="Standard Terms and Conditions"
              className={cn(FIELD, "h-10 w-full text-sm")}
            />
          </label>
        </Card>
      </section>

      <section>
        <SectionTitle aside={<span className="font-mono text-[11px] text-muted">{draft.clauses.length} rules</span>}>
          Rules
        </SectionTitle>

        <Card className="overflow-hidden">
          <ol className="divide-y divide-line">
            {draft.clauses.map((clause, index) => {
              const problem = problems[index];
              const last = index === draft.clauses.length - 1;
              const name = clause.heading.trim() || `rule ${clause.id.trim() || index + 1}`;

              if (clause.key !== openKey) {
                return (
                  <li key={clause.key}>
                    <button
                      type="button"
                      onClick={() => setOpenKey(clause.key)}
                      aria-label={`Edit ${name}`}
                      className="group grid w-full grid-cols-[3rem_1fr_auto] items-start gap-3 px-5 py-3.5 text-left transition-colors hover:bg-paper focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
                    >
                      <span className="font-mono text-xs leading-6 text-muted">{clause.id || "–"}</span>
                      <span className="min-w-0">
                        <span className="block font-semibold">{clause.heading || "Untitled rule"}</span>
                        <span className="line-clamp-2 text-sm text-muted">{clause.text || "No text yet"}</span>
                        {problem && <span className="mt-1 block text-xs font-medium text-major">{problem}</span>}
                      </span>
                      <Icon name="edit" className="mt-1 size-4 text-muted group-hover:text-accent" />
                    </button>
                  </li>
                );
              }

              return (
                <li key={clause.key} className="bg-paper px-5 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      ref={last ? newest : undefined}
                      value={clause.id}
                      onChange={(e) => patchClause(clause.key, { id: e.target.value })}
                      aria-label="Rule number"
                      placeholder="No."
                      className={cn(FIELD, "h-9 w-20 shrink-0 bg-surface px-2 font-mono text-[13px]")}
                    />
                    <input
                      value={clause.heading}
                      onChange={(e) => patchClause(clause.key, { heading: e.target.value })}
                      aria-label="Rule heading"
                      placeholder="Heading, e.g. Payment terms"
                      className={cn(FIELD, "h-9 min-w-0 flex-1 basis-48 bg-surface text-sm font-semibold")}
                    />
                  </div>
                  <textarea
                    value={clause.text}
                    onChange={(e) => patchClause(clause.key, { text: e.target.value })}
                    aria-label="Rule text"
                    rows={4}
                    placeholder="The rule itself, as you would want it written into a contract."
                    className={cn(FIELD, "mt-2 w-full resize-y bg-surface py-2 text-[15px] leading-relaxed")}
                  />
                  {problem && <p className="mt-1.5 text-xs font-medium text-major">{problem}</p>}
                  <div className="mt-3 flex items-center gap-1">
                    <Button size="sm" variant="secondary" onClick={() => setOpenKey(null)}>
                      Done
                    </Button>
                    <div className="ml-auto flex items-center">
                      <IconButton icon="up" label={`Move ${name} up`} disabled={index === 0} onClick={() => move(index, -1)} />
                      <IconButton icon="down" label={`Move ${name} down`} disabled={last} onClick={() => move(index, 1)} />
                      <IconButton
                        icon="trash"
                        label={`Remove ${name}`}
                        danger
                        onClick={() => change({ ...draft, clauses: draft.clauses.filter((c) => c.key !== clause.key) })}
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </Card>

        <button
          type="button"
          onClick={addClause}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-line px-4 py-4 text-sm font-medium text-ink-soft transition-colors hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
        >
          <Icon name="plus" />
          Add a rule
        </button>
      </section>
    </>
  );
}

export function TermsView() {
  const { ownTerms, loading, status, error, reload } = useContracts();

  if (status === "error") {
    return (
      <ErrorNote
        action={
          <button type="button" onClick={reload} className="font-medium underline">
            Retry
          </button>
        }
      >
        {error}
      </ErrorNote>
    );
  }
  if (loading) return <LoadingBlock title="Loading your terms" />;
  // The editor owns a draft copy; it starts from whatever is stored when it mounts.
  return <TermsEditor terms={ownTerms} />;
}
