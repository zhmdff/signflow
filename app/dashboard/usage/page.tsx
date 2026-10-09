import type { Metadata } from "next";
import { UsageView } from "@/components/features/usage-view";

export const metadata: Metadata = { title: "AI usage" };

export default function UsagePage() {
  return <UsageView />;
}
