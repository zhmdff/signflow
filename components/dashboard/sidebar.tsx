"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";
import { Icon, type IconName } from "@/components/ui/icons";
import { useAiStatus } from "@/hooks/use-ai-status";
import { cn } from "@/lib/format";
import { FEATURES } from "@/lib/nav";

type NavItem = { href: string; label: string; icon: IconName };

/** Grouped by what the user is doing: looking after documents, or running a check on them. */
const GROUPS: { title: string | null; items: NavItem[] }[] = [
  { title: null, items: [{ href: "/dashboard", label: "Overview", icon: "overview" }] },
  {
    title: "Library",
    items: [
      { href: "/dashboard/contracts", label: "Contracts", icon: "file" },
      { href: "/dashboard/terms", label: "Our terms", icon: "edit" },
    ],
  },
  { title: "Checks", items: FEATURES },
];

const USAGE: NavItem = { href: "/dashboard/usage", label: "AI usage", icon: "chart" };

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex shrink-0 items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
        "focus-visible:outline-2 focus-visible:outline-accent",
        active ? "bg-accent font-medium text-white" : "text-ink-soft hover:bg-line-soft",
      )}
    >
      <Icon name={item.icon} />
      {item.label}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const ai = useAiStatus();

  return (
    <aside className="z-20 flex shrink-0 flex-col border-b border-line bg-surface lg:sticky lg:top-0 lg:h-screen lg:w-60 lg:border-r lg:border-b-0">
      <div className="px-5 pt-5 pb-3 lg:pb-5">
        <Logo />
      </div>

      <nav
        aria-label="Dashboard"
        className="flex gap-1 overflow-x-auto px-3 pb-3 [scrollbar-width:none] lg:flex-col lg:gap-5 lg:overflow-visible"
      >
        {GROUPS.map((group) => (
          <div key={group.title ?? "top"} className="flex shrink-0 gap-1 lg:flex-col">
            {group.title && (
              <div className="hidden px-2.5 pb-1 text-[11px] font-semibold tracking-[0.12em] text-muted uppercase lg:block">
                {group.title}
              </div>
            )}
            {group.items.map((item) => (
              <NavLink key={item.href} item={item} active={pathname === item.href} />
            ))}
          </div>
        ))}
        {/* On wide screens this link sits at the foot of the sidebar instead. */}
        <div className="flex shrink-0 lg:hidden">
          <NavLink item={USAGE} active={pathname === USAGE.href} />
        </div>
      </nav>

      <div className="mt-auto hidden border-t border-line p-3 lg:block">
        <NavLink item={USAGE} active={pathname === USAGE.href} />
        {ai && (
          <div className="mt-2 flex items-center gap-2 px-2.5 text-xs text-muted">
            <span className={cn("size-2 shrink-0 rounded-full", ai.configured ? "bg-minor" : "bg-major")} />
            <span className="truncate">
              {!ai.configured ? "No API key" : ai.keyCount > 1 ? `${ai.keyCount} keys connected` : "AI connected"}
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}
