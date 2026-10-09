import type { Metadata } from "next";
import { RemindersView } from "@/components/features/reminders-view";

export const metadata: Metadata = { title: "Expiry and renewal" };

export default function RemindersPage() {
  return <RemindersView />;
}
