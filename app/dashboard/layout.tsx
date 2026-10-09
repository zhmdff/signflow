import { ContractViewer } from "@/components/contract-viewer";
import { Sidebar } from "@/components/dashboard/sidebar";

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <Sidebar />
      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-5xl px-5 py-8 lg:px-10 lg:py-10">{children}</div>
      </main>
      <ContractViewer />
    </div>
  );
}
