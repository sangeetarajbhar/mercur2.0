import type { Filter } from "@mercurjs/dashboard-shared";

export const useVideoEncodingJobsListTableFilters = (): Filter[] => {
  const filters: Filter[] = [];

  const dateFilters: Filter[] = [
    { label: "Created At", key: "created_at" },
    { label: "Updated At", key: "updated_at" },
  ].map((f) => ({
    key: f.key,
    label: f.label,
    type: "date" as const,
  }));

  const statusFilter: Filter = {
    key: "status",
    label: "Video Encoding Status",
    type: "select",
    options: [
      { label: "UPLOADED", value: "UPLOADED" },
      { label: "PROCESSING", value: "PROCESSING" },
      { label: "COMPLETED", value: "COMPLETED" },
      { label: "FAILED", value: "FAILED" },
    ],
  };

  return [statusFilter, ...dateFilters, ...filters];
};
