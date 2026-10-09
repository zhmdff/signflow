import type { Metadata } from "next";
import { AskView } from "@/components/features/ask-view";

export const metadata: Metadata = { title: "Ask a contract" };

export default function AskPage() {
  return <AskView />;
}
