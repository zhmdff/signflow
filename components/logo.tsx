import Link from "next/link";
import { cn } from "@/lib/format";

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2 text-ink", className)}>
      <span className="grid size-7 place-items-center rounded-md bg-ink font-mono text-[13px] font-semibold text-paper">
        §
      </span>
      <span className="font-display text-2xl leading-none">SignFlow</span>
    </Link>
  );
}
