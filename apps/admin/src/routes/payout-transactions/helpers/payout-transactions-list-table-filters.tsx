import type { Filter } from "@mercurjs/dashboard-shared";

export const usePayoutTransactionsListTableFilters = (): Filter[] => {
  const dateFilters: Filter[] = [
    { label: "Created At", key: "created_at", type: "date" },
    { label: "Updated At", key: "updated_at", type: "date" },
  ];

  const statusFilter: Filter = {
    key: "status",
    label: "Payout Status",
    type: "select",
    options: [
      { label: "queued", value: "queued" },
      { label: "pending", value: "pending" },
      { label: "rejected", value: "rejected" },
      { label: "processing", value: "processing" },
      { label: "processed", value: "processed" },
      { label: "cancelled", value: "cancelled" },
      { label: "reversed", value: "reversed" },
      { label: "failed", value: "failed" },
    ],
  };

  const paymentModeFilter: Filter = {
    key: "payout_mode",
    label: "Payment Mode",
    type: "select",
    options: [
      { label: "UPI", value: "UPI" },
      { label: "IMPS", value: "IMPS" },
    ],
  };

  return [statusFilter, paymentModeFilter, ...dateFilters];
};
