import { useQueryParams } from "@mercurjs/dashboard-shared";

type UseCustomerBankAccountVerificationTableQueryProps = {
  prefix?: string;
  pageSize?: number;
};

export const useCustomerBankAccountVerificationListTableQuery = ({
  prefix,
  pageSize,
}: UseCustomerBankAccountVerificationTableQueryProps) => {
  const queryObject = useQueryParams(
    ["offset", "q", "created_at", "updated_at", "status", "order"],
    prefix
  );

  const { offset, created_at, updated_at, status, q, order } = queryObject;

  const searchParams = {
    limit: pageSize,
    offset: offset ? Number(offset) : 0,
    status: status?.split(","),
    created_at: created_at ? JSON.parse(created_at) : undefined,
    updated_at: updated_at ? JSON.parse(updated_at) : undefined,
    order: order ?? "-created_at",
    q,
  };

  return {
    searchParams,
    raw: queryObject,
  };
};
