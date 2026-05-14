import { type QueryKey, type UseQueryOptions, useQuery } from "@tanstack/react-query";
import { queryKeysFactory } from "@mercurjs/dashboard-shared";
import type {
  CustomerBankAccountVerification,
  CustomerBankDetail,
  MappedCustomerRow,
} from "../../routes/customer-bank-detail/types";

export const customerBankDetailQueryKeys = queryKeysFactory("customer_bank_detail");

type CustomerBankDetailResponse = {
  customer_bank_details: CustomerBankDetail[];
  count: number;
  offset: number;
  limit: number;
};

type CustomerBankDetailRetrieveResponse = {
  customer_bank_detail: CustomerBankDetail;
  customer_bank_account_verification: CustomerBankAccountVerification | null;
};

type MappedCustomersResponse = {
  mapped_customers: MappedCustomerRow[];
  count: number;
  offset: number;
  limit: number;
};

const buildQueryString = (params?: Record<string, unknown>) => {
  if (!params) return "";
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    searchParams.set(key, String(value));
  });
  const query = searchParams.toString();
  return query ? `?${query}` : "";
};

type CustomerBankDetailFilters = {
  created_at?: unknown;
  updated_at?: unknown;
  status?: string[] | string;
  sort?: string;
};

export const useCustomerBankDetails = (
  query?: Record<string, unknown>,
  options?: Omit<
    UseQueryOptions<CustomerBankDetailResponse, Error, CustomerBankDetailResponse, QueryKey>,
    "queryFn" | "queryKey"
  >,
  filters?: CustomerBankDetailFilters
) => {
  const apiQuery: Record<string, unknown> = {
    ...query,
    ...(filters?.created_at != null && filters.created_at !== ""
      ? { created_at: JSON.stringify(filters.created_at) }
      : {}),
    ...(filters?.updated_at != null && filters.updated_at !== ""
      ? { updated_at: JSON.stringify(filters.updated_at) }
      : {}),
    ...(filters?.status
      ? {
          status: Array.isArray(filters.status) ? filters.status.join(",") : filters.status,
        }
      : {}),
    ...(filters?.sort ? { order: filters.sort } : {}),
  };

  const { data, isFetching, ...rest } = useQuery({
    queryKey: customerBankDetailQueryKeys.list(apiQuery),
    queryFn: async () => {
      const response = await fetch(`/admin/customer-bank-detail${buildQueryString(apiQuery)}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch customer bank details");
      }
      return response.json() as Promise<CustomerBankDetailResponse>;
    },
    ...options,
  });

  return {
    customerBankDetails: data?.customer_bank_details || [],
    count: data?.count || 0,
    offset: data?.offset || 0,
    limit: data?.limit || 0,
    isFetching,
    ...rest,
  };
};

export const useCustomerBankDetail = (
  id: string | undefined,
  options?: Omit<
    UseQueryOptions<
      CustomerBankDetailRetrieveResponse,
      Error,
      CustomerBankDetailRetrieveResponse,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
) => {
  const { data, ...rest } = useQuery({
    queryKey: customerBankDetailQueryKeys.detail(id ?? ""),
    queryFn: async () => {
      if (!id) throw new Error("ID is required");
      const response = await fetch(`/admin/customer-bank-detail/${id}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch customer bank detail");
      }
      return response.json() as Promise<CustomerBankDetailRetrieveResponse>;
    },
    enabled: !!id,
    ...options,
  });

  return {
    customerBankDetail: data?.customer_bank_detail,
    customerBankAccountVerification: data?.customer_bank_account_verification ?? null,
    ...rest,
  };
};

export const useMappedCustomersForBankDetail = (
  bankDetailId: string | undefined,
  params: { offset?: number; limit?: number },
  options?: Omit<
    UseQueryOptions<MappedCustomersResponse, Error, MappedCustomersResponse, QueryKey>,
    "queryFn" | "queryKey"
  >
) => {
  const { data, ...rest } = useQuery({
    queryKey: [...customerBankDetailQueryKeys.detail(bankDetailId ?? ""), "mapped-customers", params],
    queryFn: async () => {
      if (!bankDetailId) throw new Error("Bank detail ID is required");
      const query = new URLSearchParams();
      if (params.offset != null) query.set("offset", String(params.offset));
      if (params.limit != null) query.set("limit", String(params.limit));
      const qs = query.toString();
      const response = await fetch(
        `/admin/customer-bank-detail/${bankDetailId}/mapped-customers${qs ? `?${qs}` : ""}`,
        { credentials: "include" }
      );
      if (!response.ok) {
        throw new Error("Failed to fetch mapped customers");
      }
      return response.json() as Promise<MappedCustomersResponse>;
    },
    enabled: !!bankDetailId,
    ...options,
  });

  return {
    mappedCustomers: data?.mapped_customers ?? [],
    count: data?.count ?? 0,
    offset: data?.offset ?? 0,
    limit: data?.limit ?? 0,
    ...rest,
  };
};
