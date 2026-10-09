import { percent } from "@/lib/format";
import type { CitationStats, Usage } from "@/lib/types";
import { Icon } from "./ui/icons";

/** The standing caveat on every AI result, with the numbers that back it. */
export function ReviewNotice({
  stats,
  usage,
  cached,
}: {
  stats?: CitationStats;
  usage?: Usage;
  cached?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 rounded-md bg-line-soft px-3 py-2 text-xs text-ink-soft">
      <span className="inline-flex items-center gap-1.5 font-medium">
        <Icon name="alert" className="size-3.5" />
        AI-assisted. Needs human review.
      </span>
      {stats && stats.quotes > 0 && (
        <span>
          <span className="font-mono">
            {stats.verified}/{stats.quotes}
          </span>{" "}
          quotes found verbatim ({percent(stats.verified, stats.quotes)})
        </span>
      )}
      {usage && usage.calls > 0 && (
        <span className="font-mono">
          {(usage.promptTokens + usage.outputTokens).toLocaleString("en")} tokens
        </span>
      )}
      {cached && <span>Served from cache</span>}
    </div>
  );
}
