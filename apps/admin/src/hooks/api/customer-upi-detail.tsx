import { useQuery, QueryKey, UseQueryOptions } from "@tanstack/react-query";
import { queryKeysFactory } from "@mercurjs/dashboard-shared";
import {
  CustomerUpiDetail,
  CustomerBankAccountVerification,
  MappedCustomerRow,
} from "../../routes/customer-upi-detail/types";

export const customerUpiDetailQueryKeys =
  queryKeysFactory("customer_upi_detail");

type CustomerUpiDetailResponse = {
  customer_upi_details: CustomerUpiDetail[];
  count: number;
  offset: number;
  limit: number;
};

type CustomerUpiDetailRetrieveResponse = {
  customer_upi_detail: CustomerUpiDetail;
  customer_bank_account_verification: CustomerBankAccountVerification | null;
};

const buildQueryString = (params?: Record<string, unknown>) => {
  if (!params) return "";
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    sp.set(key, String(value));
  });
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
};

type CustomerUpiDetailFilters = {
  created_at?: Record<string, unknown>;
  updated_at?: Record<string, unknown>;
  status?: string;
  sort?: string;
};

export const useCustomerUpiDetails = (
  query?: Record<string, unknown>,
  options?: Omit<
    UseQueryOptions<
      CustomerUpiDetailResponse,
      Error,
      CustomerUpiDetailResponse,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >,
  filters?: CustomerUpiDetailFilters
) => {
  const apiQuery: Record<string, unknown> = {
    ...query,
    ...(filters?.created_at && {
      created_at: JSON.stringify(filters.created_at),
    }),
    ...(filters?.updated_at && {
      updated_at: JSON.stringify(filters.updated_at),
    }),
    ...(filters?.status && { status: filters.status }),
    ...(filters?.sort && { order: filters.sort }),
  };

  const { data, isFetching, ...rest } = useQuery({
    queryKey: customerUpiDetailQueryKeys.list(apiQuery),
    queryFn: async () => {
      const response = await fetch(
        `/admin/customer-upi-detail${buildQueryString(apiQuery)}`,
        { credentials: "include" }
      );
      if (!response.ok) {
        throw new Error("Failed to fetch customer UPI details");
      }
      return response.json();
    },
    ...options,
  });

  return {
    customerUpiDetails: (data?.customer_upi_details as CustomerUpiDetail[]) || [],
    count: data?.count || 0,
    offset: data?.offset || 0,
    limit: data?.limit || 0,
    isFetching,
    ...rest,
  };
};

export const useCustomerUpiDetail = (
  id: string | undefined,
  options?: Omit<
    UseQueryOptions<
      CustomerUpiDetailRetrieveResponse,
      Error,
      CustomerUpiDetailRetrieveResponse,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
) => {
  const { data, ...rest } = useQuery({
    queryKey: customerUpiDetailQueryKeys.detail(id ?? ""),
    queryFn: async () => {
      if (!id) throw new Error("ID is required");
      const response = await fetch(`/admin/customer-upi-detail/${id}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch customer UPI detail");
      }
      return response.json();
    },
    enabled: !!id,
    ...options,
  });

  return {
    customerUpiDetail: data?.customer_upi_detail,
    customerBankAccountVerification:
      data?.customer_bank_account_verification ?? null,
    ...rest,
  };
};

type MappedCustomersResponse = {
  mapped_customers: MappedCustomerRow[];
  count: number;
  offset: number;
  limit: number;
};

export const useMappedCustomers = (
  upiDetailId: string | undefined,
  params: { offset?: number; limit?: number },
  options?: Omit<
    UseQueryOptions<
      MappedCustomersResponse,
      Error,
      MappedCustomersResponse,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
) => {
  const { data, ...rest } = useQuery({
    queryKey: [
      ...customerUpiDetailQueryKeys.detail(upiDetailId ?? ""),
      "mapped-customers",
      params,
    ],
    queryFn: async () => {
      if (!upiDetailId) throw new Error("UPI detail ID is required");
      const query = new URLSearchParams();
      if (params.offset != null) query.set("offset", String(params.offset));
      if (params.limit != null) query.set("limit", String(params.limit));
      const qs = query.toString();
      const response = await fetch(
        `/admin/customer-upi-detail/${upiDetailId}/mapped-customers${qs ? `?${qs}` : ""}`,
        { credentials: "include" }
      );
      if (!response.ok) {
        throw new Error("Failed to fetch mapped customers");
      }
      return response.json();
    },
    enabled: !!upiDetailId,
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
