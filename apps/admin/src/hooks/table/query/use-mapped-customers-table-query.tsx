import { useQueryParams } from "@mercurjs/dashboard-shared";

type UseMappedCustomersTableQueryProps = {
  prefix?: string;
  pageSize?: number;
};

export const useMappedCustomersTableQuery = ({
  prefix = "mapped_customers",
  pageSize = 10,
}: UseMappedCustomersTableQueryProps) => {
  const queryObject = useQueryParams(["offset"], prefix);

  const offset = queryObject.offset;

  const searchParams = {
    limit: pageSize,
    offset: offset ? Number(offset) : 0,
  };

  return {
    searchParams,
    raw: queryObject,
  };
};
