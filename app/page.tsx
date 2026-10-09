import Link from "next/link";
import { Logo } from "@/components/logo";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { FEATURES } from "@/lib/nav";

const STEPS = [
  {
    title: "Index",
    text: "Each contract is split into clauses once, and every clause keeps its number. PDFs and pasted text both work.",
  },
  {
    title: "Reason",
    text: "Gemini answers in a fixed structure and must name the clause and quote the words it relied on.",
  },
  {
    title: "Verify",
    text: "Code, not the model, checks that each quote appears in the source. Anything it cannot find is flagged.",
  },
];

/** A static example of one finding, so the product is visible before the first click. */
function SampleFinding() {
  return (
    <figure className="rounded-xl border border-line bg-surface shadow-[0_24px_60px_-30px_rgba(23,25,31,0.35)]">
      <div className="flex items-center gap-3 border-b border-line px-5 py-3">
        <span className="font-display text-2xl leading-none">Liability</span>
        <Badge tone="critical">Critical</Badge>
        <span className="ml-auto font-mono text-[11px] text-muted">Caspian Freight</span>
      </div>
      <div className="grid gap-5 px-5 py-5 sm:grid-cols-2">
        {[
          {
            side: "Our terms",
            clause: "§ 2.1",
            quote: "The cap shall apply equally to both parties.",
          },
          {
            side: "Their contract",
            clause: "§ 4.2",
            quote: "the Customer's liability shall be unlimited.",
          },
        ].map((q) => (
          <div key={q.side} className="border-l-2 border-ink/25 pl-3">
            <div className="mb-1 flex items-center gap-2">
              <span className="text-[11px] font-semibold tracking-wide text-muted uppercase">{q.side}</span>
              <span className="rounded border border-line bg-paper px-1.5 py-0.5 font-mono text-[11px] text-ink-soft">
                {q.clause}
              </span>
            </div>
            <blockquote className="font-display text-lg leading-snug">“{q.quote}”</blockquote>
            <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-minor">
              <Icon name="check" className="size-3" />
              Found verbatim
            </div>
          </div>
        ))}
      </div>
      <figcaption className="mx-5 mb-5 rounded-md border border-accent/20 bg-accent-soft/60 px-3 py-2.5">
        <div className="text-[11px] font-semibold tracking-wide text-accent uppercase">Suggested wording</div>
        <p className="mt-1 text-sm">
          Each party&apos;s total liability shall not exceed the fees paid or payable in the twelve months preceding
          the claim.
        </p>
      </figcaption>
    </figure>
  );
}

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Logo />
        <Link href="/dashboard" className={buttonClass("secondary", "sm")}>
          Open dashboard
        </Link>
      </header>

      <main className="flex-1">
        <section className="mx-auto grid w-full max-w-6xl items-center gap-12 px-5 pt-10 pb-20 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:pt-20">
          <div>
            <div className="mb-5 font-mono text-[11px] tracking-[0.14em] text-accent uppercase">
              Contract review with receipts
            </div>
            <h1 className="font-display text-5xl leading-[1.02] tracking-tight sm:text-7xl">
              Find the conflict <em className="text-accent">before</em> the vendor does.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
              SignFlow reads your contracts against your own terms and the law, so you find out about conflicts
              before a vendor or a fine does. Every answer points to the clause it came from.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/dashboard/compare" className={buttonClass("primary", "lg")}>
                Compare a contract
                <Icon name="arrow" />
              </Link>
              <Link href="/dashboard" className={buttonClass("ghost", "lg")}>
                See the dashboard
              </Link>
            </div>
          </div>
          <SampleFinding />
        </section>

        <section className="border-y border-line bg-surface">
          <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8">
            <h2 className="max-w-2xl font-display text-4xl leading-tight sm:text-5xl">
              Four checks on one clause index.
            </h2>
            <div className="mt-10 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2">
              {FEATURES.map((feature, i) => (
                <Link
                  key={feature.href}
                  href={feature.href}
                  className="group bg-surface p-6 transition-colors hover:bg-paper focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-muted">0{i + 1}</span>
                    <Icon name={feature.icon} className="size-5 text-accent" />
                  </div>
                  <h3 className="mt-6 font-display text-3xl leading-tight">{feature.title}</h3>
                  <p className="mt-2 text-[15px] text-muted">{feature.blurb}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent">
                    Open
                    <Icon name="arrow" className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8">
          <h2 className="max-w-2xl font-display text-4xl leading-tight sm:text-5xl">
            Why you can check its work.
          </h2>
          <ol className="mt-10 grid gap-8 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title} className="border-t border-ink pt-4">
                <div className="font-mono text-xs text-muted">Step {i + 1}</div>
                <h3 className="mt-2 font-display text-3xl">{step.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-sm text-muted sm:px-8">
          <span>SignFlow is AI-assisted. Every finding needs review by a qualified person.</span>
          <Link href="/dashboard" className="font-medium text-ink hover:text-accent">
            Open dashboard
          </Link>
        </div>
      </footer>
    </div>
  );
}
