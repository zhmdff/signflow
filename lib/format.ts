import type { Contract, ContractKind, Topic } from "@/lib/types";

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

const DATE = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "Not stated";
  const time = Date.parse(`${iso}T00:00:00Z`);
  return Number.isNaN(time) ? iso : DATE.format(time);
}

export const KIND_LABEL: Record<ContractKind, string> = {
  own_terms: "Our terms",
  partner: "Partner",
  employee: "Employee",
};

export const TOPIC_LABEL: Record<Topic, string> = {
  liability: "Liability",
  payment_terms: "Payment terms",
  termination: "Termination",
  renewal: "Renewal",
  ip: "Intellectual property",
  confidentiality: "Confidentiality",
  penalties: "Penalties",
  governing_law: "Governing law",
  data_protection: "Data protection",
  subcontracting: "Subcontracting",
  other: "Other",
};

/** How a contract is named in citations, e.g. "Employee – Aysel Mammadova". */
export function contractLabel(contract: Contract): string {
  return contract.kind === "own_terms" ? "Our terms" : `${KIND_LABEL[contract.kind]} – ${contract.counterparty}`;
}

export function percent(part: number, whole: number): string {
  return whole === 0 ? "n/a" : `${Math.round((part / whole) * 100)}%`;
}
