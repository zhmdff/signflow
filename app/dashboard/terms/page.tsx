import type { Metadata } from "next";
import { TermsView } from "@/components/features/terms-view";

export const metadata: Metadata = { title: "Our terms" };

export default function TermsPage() {
  return <TermsView />;
}
