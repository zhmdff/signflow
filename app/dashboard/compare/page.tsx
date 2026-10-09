import type { Metadata } from "next";
import { CompareView } from "@/components/features/compare-view";

export const metadata: Metadata = { title: "Compare with our terms" };

export default function ComparePage() {
  return <CompareView />;
}
