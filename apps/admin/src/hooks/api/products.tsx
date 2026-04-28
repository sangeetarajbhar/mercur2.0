import { useMutation, useQuery, type UseMutationOptions } from "@tanstack/react-query";
import type { HttpTypes } from "@medusajs/types";

type FetchError = Error & { status?: number };

const uploadFileQuery = async (file: File) => {
  const formData = new FormData();
  formData.append("files", file);

  const response = await fetch("/admin/uploads", {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  if (!response.ok) {
    const error: FetchError = new Error(`Failed to upload file (${response.status})`);
    error.status = response.status;
    throw error;
  }

  return (await response.json()) as { files?: Array<{ id: string }> };
};

const enhancedImportProductsQuery = async (file: File, sellerId?: string) => {
  const uploadResponse = await uploadFileQuery(file);
  const fileKey = uploadResponse.files?.[0]?.id;

  if (!fileKey) {
    throw new Error("Failed to get file key from upload response");
  }

  const payload: Record<string, unknown> = {
    file_key: fileKey,
    originalname: file.name,
    extension: file.name.split(".").pop() || "csv",
    size: file.size,
    mime_type: file.type || "text/csv",
  };

  if (sellerId) {
    payload.seller_id = sellerId;
  }

  const response = await fetch("/admin/products/enhanced-import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "include",
  });

  if (!response.ok) {
    const error: FetchError = new Error(`Enhanced import failed (${response.status})`);
    error.status = response.status;
    throw error;
  }

  return (await response.json()) as HttpTypes.AdminImportProductResponse;
};

const confirmEnhancedImportProductsQuery = async (transactionId: string) => {
  const response = await fetch(`/admin/products/enhanced-import/${transactionId}/confirm`, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    const error: FetchError = new Error(`Confirm import failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
};

export const useEnhancedImportProducts = (
  options?: UseMutationOptions<
    HttpTypes.AdminImportProductResponse,
    FetchError,
    { file: File; sellerId?: string }
  >
) => {
  return useMutation({
    mutationFn: (payload) => enhancedImportProductsQuery(payload.file, payload.sellerId),
    ...options,
  });
};

export const useConfirmEnhancedImportProducts = (
  options?: UseMutationOptions<void, FetchError, string>
) => {
  return useMutation({
    mutationFn: (transactionId) => confirmEnhancedImportProductsQuery(transactionId),
    ...options,
  });
};

export const useAdminSellers = () => {
  return useQuery({
    queryKey: ["admin_sellers_for_import"],
    queryFn: async () => {
      const response = await fetch("/admin/sellers", {
        credentials: "include",
        headers: { accept: "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch sellers (${response.status})`);
      }

      return (await response.json()) as {
        sellers?: Array<{ id: string; name?: string | null }>;
      };
    },
  });
};
