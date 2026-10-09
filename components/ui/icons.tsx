import type { SVGProps } from "react";

const PATHS = {
  overview: "M4 4h7v7H4zM13 4h7v4h-7zM13 11h7v9h-7zM4 14h7v6H4z",
  compare: "M12 3v18M5 7h4M5 11h4M5 15h3M15 7h4M15 11h4M15 15h3",
  law: "M12 3v18M7 21h10M5 7h14M5 7l-3 7a3.5 3.5 0 0 0 6 0L5 7zM19 7l-3 7a3.5 3.5 0 0 0 6 0l-3-7z",
  ask: "M4 5h16v11H9l-5 4V5z",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  upload: "M12 16V4M7 9l5-5 5 5M4 16v4h16v-4",
  check: "M5 12.5l4.5 4.5L19 7.5",
  alert: "M12 4l9 16H3L12 4zM12 10v4M12 17v.5",
  close: "M6 6l12 12M18 6L6 18",
  arrow: "M5 12h14M13 6l6 6-6 6",
  copy: "M9 9h11v11H9zM5 15H4V4h11v1",
  file: "M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6",
  refresh: "M20 11a8 8 0 0 0-14.9-3M4 4v4h4M4 13a8 8 0 0 0 14.9 3M20 20v-4h-4",
  trash: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5",
  repeat: "M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3",
  edit: "M4 20h4L19 9l-4-4L4 16v4zM13 7l4 4",
  plus: "M12 5v14M5 12h14",
  up: "M12 19V5M6 11l6-6 6 6",
  down: "M12 5v14M6 13l6 6 6-6",
  send: "M4 12l16-8-6 16-3-7-7-1z",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className, ...props }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className ?? "size-4"}
      {...props}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
