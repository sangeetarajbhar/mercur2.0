import { useQuery, type QueryKey, type UseQueryOptions } from "@tanstack/react-query";
import { queryKeysFactory } from "@mercurjs/dashboard-shared";
import type { CustomerBankAccountVerification } from "../../routes/customer-bank-account-verification/types";

export const customerBankAccountVerificationQueryKeys = queryKeysFactory(
  "customer_bank_account_verification"
);

type CustomerBankAccountVerificationResponse = {
  customer_bank_account_verifications: CustomerBankAccountVerification[];
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

export const useCustomerBankAccountVerification = (
  query?: Record<string, unknown>,
  options?: Omit<
    UseQueryOptions<
      CustomerBankAccountVerificationResponse,
      Error,
      CustomerBankAccountVerificationResponse,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >,
  filters?: {
    created_at?: unknown;
    updated_at?: unknown;
    status?: string[] | string;
    sort?: string;
  }
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
          status: Array.isArray(filters.status)
            ? filters.status.join(",")
            : filters.status,
        }
      : {}),
    ...(filters?.sort ? { order: filters.sort } : {}),
  };

  const { data, isFetching, ...rest } = useQuery({
    queryKey: customerBankAccountVerificationQueryKeys.list(apiQuery),
    queryFn: async () => {
      const response = await fetch(
        `/admin/customer-bank-account-verification${buildQueryString(apiQuery)}`,
        { credentials: "include" }
      );
      if (!response.ok) {
        throw new Error("Failed to fetch customer bank account verification data");
      }
      return response.json() as Promise<CustomerBankAccountVerificationResponse>;
    },
    ...options,
  });

  const customerBankAccountVerifications = data?.customer_bank_account_verifications || [];

  return {
    customerBankAccountVerifications,
    count: data?.count || 0,
    offset: data?.offset || 0,
    limit: data?.limit || 0,
    isFetching,
    ...rest,
  };
};
