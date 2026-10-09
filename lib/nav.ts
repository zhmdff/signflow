import type { IconName } from "@/components/ui/icons";

export type Feature = {
  href: string;
  label: string;
  icon: IconName;
  title: string;
  blurb: string;
};

/** The four functions, in demo order. Drives the sidebar, the overview and the landing page. */
export const FEATURES: Feature[] = [
  {
    href: "/dashboard/compare",
    label: "Compare",
    icon: "compare",
    title: "Compare with our terms",
    blurb:
      "Set a partner contract beside your own terms. Every mismatch comes with both clauses quoted, a severity and replacement wording.",
  },
  {
    href: "/dashboard/law",
    label: "Law scanner",
    icon: "law",
    title: "Scan a law change",
    blurb:
      "Paste a new law. See which signed contracts it breaks, the clause at fault, the deadline and an amendment to send.",
  },
  {
    href: "/dashboard/ask",
    label: "Ask",
    icon: "ask",
    title: "Ask a contract",
    blurb:
      "Ask in plain language and get an answer that cites the clause. When the contract is silent, it says so.",
  },
  {
    href: "/dashboard/reminders",
    label: "Reminders",
    icon: "clock",
    title: "Expiry and renewal",
    blurb:
      "Notice deadlines worked out from each contract's dates, sorted by urgency, with auto-renewals flagged.",
  },
];
