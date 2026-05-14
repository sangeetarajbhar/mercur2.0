import { useQueryParams } from "@mercurjs/dashboard-shared";

type UsePayoutTransactionsTableQueryProps = {
  prefix?: string;
  pageSize?: number;
};

export const usePayoutTransactionsListTableQuery = ({
  prefix,
  pageSize,
}: UsePayoutTransactionsTableQueryProps) => {
  const queryObject = useQueryParams(
    ["offset", "q", "created_at", "updated_at", "status", "order", "payout_mode"],
    prefix
  );

  const { offset, created_at, updated_at, status, q, order, payout_mode } = queryObject;

  const searchParams = {
    limit: pageSize,
    offset: offset ? Number(offset) : 0,
    status: status?.split(","),
    created_at: created_at ? JSON.parse(created_at) : undefined,
    updated_at: updated_at ? JSON.parse(updated_at) : undefined,
    order: order ?? "-created_at",
    payout_mode: payout_mode ?? undefined,
    q,
  };

  return {
    searchParams,
    raw: queryObject,
  };
};
