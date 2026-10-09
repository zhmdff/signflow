"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";
import { Icon, type IconName } from "@/components/ui/icons";
import { useAiStatus } from "@/hooks/use-ai-status";
import { cn } from "@/lib/format";
import { FEATURES } from "@/lib/nav";

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/dashboard", label: "Overview", icon: "overview" },
  { href: "/dashboard/contracts", label: "Contracts", icon: "file" },
  ...FEATURES,
];

export function Sidebar() {
  const pathname = usePathname();
  const ai = useAiStatus();

  return (
    <aside className="z-20 flex shrink-0 flex-col border-b border-line bg-paper lg:sticky lg:top-0 lg:h-screen lg:w-60 lg:border-r lg:border-b-0">
      <div className="flex items-center justify-between px-5 pt-5 pb-3 lg:pb-6">
        <Logo />
      </div>

      <nav aria-label="Dashboard" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                "focus-visible:outline-2 focus-visible:outline-accent",
                active ? "bg-ink font-medium text-paper" : "text-ink-soft hover:bg-line-soft",
              )}
            >
              <Icon name={item.icon} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto hidden space-y-3 border-t border-line px-5 py-4 text-xs text-muted lg:block">
        {ai && (
          <div className="flex items-center gap-2">
            <span className={cn("size-2 rounded-full", ai.configured ? "bg-minor" : "bg-major")} />
            <span className="truncate font-mono">{ai.configured ? ai.model : "No API key"}</span>
          </div>
        )}
        <p>AI-assisted. Every finding needs human review.</p>
      </div>
    </aside>
  );
}
