import { VideoEncodingJobsStatus } from "../types";

export const getCustomVideoEncodingJobStatus = (status: string) => {
  const statusMap = {
    UPLOADED: [VideoEncodingJobsStatus.UPLOADED, "grey"],
    PROCESSING: [VideoEncodingJobsStatus.PROCESSING, "blue"],
    COMPLETED: [VideoEncodingJobsStatus.COMPLETED, "green"],
    FAILED: [VideoEncodingJobsStatus.FAILED, "red"],
  }[status] as [string, "red" | "green" | "blue" | "grey"] | undefined;

  if (!statusMap) {
    return { label: status || "Unknown", color: "grey" as const };
  }

  const [label, color] = statusMap;

  return { label, color };
};
