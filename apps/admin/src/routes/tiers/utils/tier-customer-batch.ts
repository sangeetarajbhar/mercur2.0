import type {
  CustomerUploadEntry,
  AssignTierCustomersResponse,
} from "../../../hooks/api/tiers";

export const BATCH_SIZE = 100;
export const MAX_CUSTOMERS = 5000;

export type BatchProcessOptions = {
  onProgress?: (current: number, total: number) => void;
  onBatchError?: (
    batchIndex: number,
    totalBatches: number,
    error: Error
  ) => void;
};

export type BatchProcessResult = {
  totalAssigned: number;
  totalRemoved: number;
  processedCount: number;
};

export function splitIntoBatches<T>(items: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  return batches;
}

export async function processCustomerBatches(
  allEntries: CustomerUploadEntry[],
  processBatch: (
    batch: CustomerUploadEntry[]
  ) => Promise<AssignTierCustomersResponse>,
  options?: BatchProcessOptions
): Promise<BatchProcessResult> {
  const batches = splitIntoBatches(allEntries, BATCH_SIZE);
  let totalAssigned = 0;
  let totalRemoved = 0;
  let processedCount = 0;

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];

    try {
      const result = await processBatch(batch);
      totalAssigned += result.assigned;
      totalRemoved += result.removed;
      processedCount += batch.length;

      if (options?.onProgress) {
        options.onProgress(processedCount, allEntries.length);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));

      if (options?.onBatchError) {
        options.onBatchError(batchIndex + 1, batches.length, error);
      }

      throw error;
    }
  }

  return {
    totalAssigned,
    totalRemoved,
    processedCount,
  };
}

export function mergeCustomerEntries(
  textareaEntries: CustomerUploadEntry[],
  csvEntries: CustomerUploadEntry[]
): CustomerUploadEntry[] {
  const mergedMap = new Map<string, CustomerUploadEntry>();

  for (const e of textareaEntries) {
    mergedMap.set(e.customer_id, e);
  }

  for (const e of csvEntries) {
    mergedMap.set(e.customer_id, e);
  }

  return Array.from(mergedMap.values());
}

export function validateCustomerCount(count: number): {
  valid: boolean;
  error?: string;
} {
  if (count === 0) {
    return {
      valid: false,
      error: "Please provide at least one customer ID (via CSV or text input)",
    };
  }

  if (count > MAX_CUSTOMERS) {
    return {
      valid: false,
      error: `Maximum ${MAX_CUSTOMERS.toLocaleString()} customers allowed per upload. You have ${count.toLocaleString()} customers. Please reduce the number and try again.`,
    };
  }

  return { valid: true };
}
