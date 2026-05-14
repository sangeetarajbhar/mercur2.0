/** Mirrors `PayoutTransactionsStatus` in `@acme/api` (admin bundle does not export that module path). */
const STATUS = {
  queued: "queued",
  pending: "pending",
  rejected: "rejected",
  processing: "processing",
  processed: "processed",
  cancelled: "cancelled",
  reversed: "reversed",
  failed: "failed",
} as const;

type StatusColor = "red" | "green" | "blue" | "grey" | "orange" | "purple";

export const getCustomPayoutTransactionsJobStatus = (status: string) => {
  const statusMap = {
    [STATUS.queued]: [STATUS.queued, "orange"],
    [STATUS.pending]: [STATUS.pending, "purple"],
    [STATUS.rejected]: [STATUS.rejected, "red"],
    [STATUS.processing]: [STATUS.processing, "blue"],
    [STATUS.processed]: [STATUS.processed, "green"],
    [STATUS.cancelled]: [STATUS.cancelled, "grey"],
    [STATUS.reversed]: [STATUS.reversed, "red"],
    [STATUS.failed]: [STATUS.failed, "red"],
  }[status] as [string, StatusColor] | undefined;

  if (!statusMap) {
    return { label: status || "Unknown", color: "grey" as const };
  }

  const [label, color] = statusMap;
  return { label, color };
};
