import type { Metadata } from "next";
import { LawView } from "@/components/features/law-view";

export const metadata: Metadata = { title: "Law scanner" };

export default function LawPage() {
  return <LawView />;
}
