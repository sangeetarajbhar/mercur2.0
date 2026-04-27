import { useRef, useState } from "react";
import {
  Button,
  FocusModal,
  Heading,
  Text,
  Textarea,
  toast,
} from "@medusajs/ui";

import {
  useAssignTierCustomers,
  CustomerUploadEntry,
} from "../../../hooks/api/tiers";
import {
  MAX_CUSTOMERS,
  mergeCustomerEntries,
  validateCustomerCount,
  processCustomerBatches,
} from "../utils/tier-customer-batch";

type TierAssignCustomersModalProps = {
  tierId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export const TierAssignCustomersModal = ({
  tierId,
  open,
  onOpenChange,
}: TierAssignCustomersModalProps) => {
  const [pastedIds, setPastedIds] = useState("");
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [csvEntries, setCsvEntries] = useState<CustomerUploadEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState({
    current: 0,
    total: 0,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { mutateAsync: assignCustomers, isPending } =
    useAssignTierCustomers(tierId);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      const entries: CustomerUploadEntry[] = [];
      for (const line of lines) {
        const cols = line
          .split(",")
          .map((c) => c.trim().replace(/^"|"$/g, ""));
        const firstCol = cols[0];
        const secondCol = cols[1]?.toLowerCase();

        if (
          firstCol.toLowerCase() === "customer_id" ||
          firstCol.toLowerCase() === "id"
        ) {
          continue;
        }
        if (!firstCol) {
          continue;
        }

        const action: "add" | "remove" =
          secondCol === "remove" ? "remove" : "add";
        entries.push({ customer_id: firstCol, action });
      }
      setCsvEntries(entries);
    };
    reader.readAsText(file);
  };

  const handleClose = () => {
    setPastedIds("");
    setCsvFileName(null);
    setCsvEntries([]);
    setIsProcessing(false);
    setProcessingProgress({ current: 0, total: 0 });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onOpenChange(false);
  };

  const parseTextareaEntries = (): CustomerUploadEntry[] => {
    return pastedIds
      .split(/\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(",").map((p) => p.trim());
        const customer_id = parts[0];
        const action: "add" | "remove" =
          parts[1]?.toLowerCase() === "remove" ? "remove" : "add";
        return { customer_id, action };
      })
      .filter((e) => e.customer_id);
  };

  const handleSubmit = async () => {
    toast.dismiss();
    const textareaEntries = parseTextareaEntries();

    const allEntries = mergeCustomerEntries(textareaEntries, csvEntries);

    const validation = validateCustomerCount(allEntries.length);
    if (!validation.valid) {
      toast.error(validation.error || "Invalid customer entries");
      return;
    }

    setIsProcessing(true);
    setProcessingProgress({ current: 0, total: allEntries.length });

    try {
      const result = await processCustomerBatches(allEntries, assignCustomers, {
        onProgress: (current, total) => {
          setProcessingProgress({ current, total });
        },
      });

      toast.success(
        `Successfully processed: ${result.totalAssigned} assigned, ${result.totalRemoved} removed.`
      );
      handleClose();
    } catch (err) {
      const errorMessage =
        (err as Error)?.message || "Failed to process customers";
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
      setProcessingProgress({ current: 0, total: 0 });
    }
  };

  const textareaEntries = parseTextareaEntries();
  const allEntries = mergeCustomerEntries(textareaEntries, csvEntries);
  const totalPreview = allEntries.length;
  const addCount = allEntries.filter((e) => e.action === "add").length;
  const removeCount = allEntries.filter((e) => e.action === "remove").length;

  return (
    <FocusModal open={open} onOpenChange={handleClose}>
      <FocusModal.Content>
        <FocusModal.Header>
          <Heading level="h2">Assign / Remove Customers from Tier</Heading>
        </FocusModal.Header>

        <FocusModal.Body className="flex flex-1 flex-col items-center overflow-y-auto">
          <div className="flex w-full max-w-[640px] flex-col gap-y-8 px-2 py-12">
            <div className="flex flex-col gap-y-3">
              <Heading level="h3">Option 1 — Upload CSV</Heading>
              <Text size="small" className="text-ui-fg-muted">
                Upload a CSV file with columns: <code>customer_id</code> and
                optionally <code>action</code> (<code>add</code> or{" "}
                <code>remove</code>). If <code>action</code> is omitted, it
                defaults to <code>add</code>. Maximum{" "}
                {MAX_CUSTOMERS.toLocaleString()} rows per upload.
              </Text>
              <Text size="xsmall" className="text-ui-fg-muted font-mono">
                Example:
                <br />
                customer_id,action
                <br />
                cus_01ABC...,add
                <br />
                cus_01XYZ...,remove
              </Text>
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="csv-upload"
                />
                <Button
                  variant="secondary"
                  size="small"
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose CSV file
                </Button>
                {csvFileName ? (
                  <Text size="small" className="text-ui-fg-subtle">
                    {csvFileName} — <strong>{csvEntries.length}</strong> entries
                    found
                  </Text>
                ) : (
                  <Text size="small" className="text-ui-fg-muted">
                    No file chosen
                  </Text>
                )}
              </div>
              {csvEntries.length > 0 && (
                <div className="rounded-md bg-ui-bg-subtle border border-ui-border-base p-3 max-h-28 overflow-y-auto">
                  <Text size="small" className="text-ui-fg-muted font-mono">
                    {csvEntries
                      .slice(0, 10)
                      .map((e) => `${e.customer_id} → ${e.action}`)
                      .join("\n")}
                    {csvEntries.length > 10 &&
                      `\n... and ${csvEntries.length - 10} more`}
                  </Text>
                </div>
              )}
            </div>

            <div className="border-t border-ui-border-base" />

            <div className="flex flex-col gap-y-3">
              <Heading level="h3">Option 2 — Paste Customer IDs</Heading>
              <Text size="small" className="text-ui-fg-muted">
                One entry per line. Format: <code>customer_id</code> (defaults
                to add) or <code>customer_id,remove</code>. Maximum{" "}
                {MAX_CUSTOMERS.toLocaleString()} entries per upload.
              </Text>
              <Textarea
                placeholder={
                  "cus_01ABCDEF...\ncus_01GHIJKL...,remove\ncus_01MNOPQR...,add"
                }
                value={pastedIds}
                onChange={(e) => setPastedIds(e.target.value)}
                rows={6}
              />
            </div>

            {totalPreview > 0 && (
              <div
                className={`rounded-md border p-4 ${
                  totalPreview > MAX_CUSTOMERS
                    ? "bg-ui-bg-danger-subtle border-ui-border-danger"
                    : "bg-ui-bg-highlight border-ui-border-base"
                }`}
              >
                <Text
                  size="small"
                  className={
                    totalPreview > MAX_CUSTOMERS ? "text-ui-fg-danger" : ""
                  }
                >
                  <strong>{totalPreview.toLocaleString()}</strong> unique
                  entries ready to process: <strong>{addCount}</strong> to add,{" "}
                  <strong>{removeCount}</strong> to remove.
                  {totalPreview > MAX_CUSTOMERS && (
                    <span className="block mt-1">
                      Exceeds maximum limit of{" "}
                      {MAX_CUSTOMERS.toLocaleString()} entries.
                    </span>
                  )}
                </Text>
              </div>
            )}

            {isProcessing && processingProgress.total > 0 && (
              <div className="rounded-md border border-ui-border-base bg-ui-bg-subtle p-4">
                <div className="flex items-center justify-between mb-2">
                  <Text size="small" className="text-ui-fg-subtle">
                    Processing customers...
                  </Text>
                  <Text size="small" className="text-ui-fg-subtle">
                    {processingProgress.current} / {processingProgress.total}
                  </Text>
                </div>
                <div className="w-full bg-ui-bg-base rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-ui-bg-interactive h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(
                        100,
                        (processingProgress.current /
                          processingProgress.total) *
                          100
                      )}%`,
                    }}
                  />
                </div>
                <Text size="xsmall" className="text-ui-fg-muted mt-2">
                  Processing in batches...
                </Text>
              </div>
            )}
          </div>
        </FocusModal.Body>

        <FocusModal.Footer>
          <div className="flex items-center justify-end gap-x-2">
            <Button
              variant="secondary"
              size="small"
              onClick={handleClose}
              disabled={isPending || isProcessing}
            >
              Cancel
            </Button>
            <Button
              size="small"
              type="button"
              isLoading={isPending || isProcessing}
              onClick={handleSubmit}
              disabled={
                totalPreview === 0 ||
                totalPreview > MAX_CUSTOMERS ||
                isProcessing
              }
            >
              {isProcessing
                ? `Processing... (${processingProgress.current}/${processingProgress.total})`
                : totalPreview > 0
                ? `Process ${totalPreview.toLocaleString()} Customer(s)`
                : "Process"}
            </Button>
          </div>
        </FocusModal.Footer>
      </FocusModal.Content>
    </FocusModal>
  );
};
