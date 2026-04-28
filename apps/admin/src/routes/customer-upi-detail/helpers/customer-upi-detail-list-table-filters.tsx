export type Filter = {
  key: string;
  label: string;
  type: string;
};

export const useCustomerUpiDetailListTableFilters = (): Filter[] => {
  const dateFilters: Filter[] = [
    { label: "Created At", key: "created_at" },
    { label: "Updated At", key: "updated_at" },
  ].map((f) => ({
    key: f.key,
    label: f.label,
    type: "date",
  }));

  return [...dateFilters];
};
