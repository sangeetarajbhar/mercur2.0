import type { Filter } from "@mercurjs/dashboard-shared";

export const useCustomerBankDetailListTableFilters = (): Filter[] => {
  return [
    { label: "Created At", key: "created_at", type: "date" },
    { label: "Updated At", key: "updated_at", type: "date" },
  ];
};
