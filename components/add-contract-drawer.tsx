"use client";

import type { Contract, ContractKind } from "@/lib/types";
import { Drawer } from "./ui/drawer";
import { UploadPanel } from "./upload-panel";

/** The one place a contract is added from, wherever the "Add contract" button sits. */
export function AddContractDrawer({
  open,
  onClose,
  defaultKind,
  lockKind,
  onUploaded,
}: {
  open: boolean;
  onClose: () => void;
  defaultKind?: ContractKind;
  lockKind?: boolean;
  onUploaded?: (contract: Contract) => void;
}) {
  return (
    <Drawer open={open} onClose={onClose} label="Add a contract">
      <header className="border-b border-line px-6 py-5 pr-14">
        <h2 className="heading text-xl">Add a contract</h2>
        <p className="mt-1 text-sm text-muted">
          Upload a PDF or text file, or paste the text. SignFlow splits it into clauses and reads the parties, dates
          and notice period.
        </p>
      </header>
      <div className="px-6 py-5">
        <UploadPanel
          defaultKind={defaultKind}
          lockKind={lockKind}
          onUploaded={(contract) => {
            onClose();
            onUploaded?.(contract);
          }}
        />
      </div>
    </Drawer>
  );
}
