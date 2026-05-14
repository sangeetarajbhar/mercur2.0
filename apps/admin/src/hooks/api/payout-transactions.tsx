import { type QueryKey, type UseQueryOptions, useQuery } from "@tanstack/react-query";
import { queryKeysFactory } from "@mercurjs/dashboard-shared";
import type { PayoutTransactions } from "../../routes/payout-transactions/types";

export const payoutTransactionsQueryKeys = queryKeysFactory("payout_transactions");

type PayoutTransactionsResponse = {
  payout_transactions: PayoutTransactions[];
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

type PayoutTransactionsFilters = {
  created_at?: unknown;
  updated_at?: unknown;
  status?: string[] | string;
  sort?: string;
  payout_mode?: string;
};

export const usePayoutTransactions = (
  query?: Record<string, unknown>,
  options?: Omit<
    UseQueryOptions<PayoutTransactionsResponse, Error, PayoutTransactionsResponse, QueryKey>,
    "queryFn" | "queryKey"
  >,
  filters?: PayoutTransactionsFilters
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
    ...(filters?.payout_mode ? { payout_mode: filters.payout_mode } : {}),
  };

  const { data, isFetching, ...rest } = useQuery({
    queryKey: payoutTransactionsQueryKeys.list(apiQuery),
    queryFn: async () => {
      const response = await fetch(`/admin/payout-transactions${buildQueryString(apiQuery)}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch payout transactions");
      }
      return response.json() as Promise<PayoutTransactionsResponse>;
    },
    ...options,
  });

  return {
    payoutTransactions: data?.payout_transactions || [],
    count: data?.count || 0,
    offset: data?.offset || 0,
    limit: data?.limit || 0,
    isFetching,
    ...rest,
  };
};
