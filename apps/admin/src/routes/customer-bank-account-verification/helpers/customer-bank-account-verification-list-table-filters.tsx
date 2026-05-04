import type { Filter } from "@mercurjs/dashboard-shared";

export const useCustomerBankAccountVerificationListTableFilters = (): Filter[] => {
  const dateFilters: Filter[] = [
    { label: "Created At", key: "created_at" },
    { label: "Updated At", key: "updated_at" },
  ].map((filter) => ({
    key: filter.key,
    label: filter.label,
    type: "date" as const,
  }));

  return [...dateFilters];
};
