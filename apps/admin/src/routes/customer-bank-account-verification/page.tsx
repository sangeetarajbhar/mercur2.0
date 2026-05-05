import { Container, Heading } from "@medusajs/ui";
import type { RouteConfig } from "@mercurjs/dashboard-sdk";
import { TaxInclusive } from "@medusajs/icons";
import { keepPreviousData } from "@tanstack/react-query";
import {
  _DataTable,
  SingleColumnPage,
  useDataTable,
} from "@mercurjs/dashboard-shared";
import { useCustomerBankAccountVerificationListTableFilters } from "./helpers/customer-bank-account-verification-list-table-filters";
import { useCustomerBankAccountVerificationListTableColumns } from "./components/use-customer-bank-account-verification-list-table-columns";
import { useCustomerBankAccountVerification } from "../../hooks/api/customer-bank-account-verification";
import { useCustomerBankAccountVerificationListTableQuery } from "../../hooks/table/query/use-customer-bank-account-verification-table-query";

const PAGE_SIZE = 10;

const CustomerBankAccountVerificationListTable = () => {
  const { searchParams, raw } = useCustomerBankAccountVerificationListTableQuery({
    pageSize: PAGE_SIZE,
  });

  const { customerBankAccountVerifications, count, isError, error, isFetching } =
    useCustomerBankAccountVerification(
      {
        offset: searchParams.offset,
        limit: searchParams.limit,
        q: searchParams.q,
      },
      { placeholderData: keepPreviousData },
      {
        created_at: searchParams.created_at,
        updated_at: searchParams.updated_at,
        status: searchParams.status,
        sort: searchParams.order,
      }
    );

  const filters = useCustomerBankAccountVerificationListTableFilters();
  const columns = useCustomerBankAccountVerificationListTableColumns({});

  const { table } = useDataTable({
    data: customerBankAccountVerifications ?? [],
    columns,
    enablePagination: true,
    count: count,
    pageSize: PAGE_SIZE,
  });

  if (isError) {
    throw error;
  }

  return (
    <SingleColumnPage>
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading>Customer Bank Account Verification</Heading>
        </div>
        <_DataTable
          columns={columns}
          table={table}
          pagination
          filters={filters}
          count={count}
          search
          isLoading={isFetching}
          pageSize={PAGE_SIZE}
          orderBy={[
            { key: "created_at", label: "Created At" },
            { key: "updated_at", label: "Updated At" },
          ]}
          queryObject={raw}
          noRecords={{
            message: "No Record Found",
          }}
        />
      </Container>
    </SingleColumnPage>
  );
};

export const config: RouteConfig = {
  label: "Customer Bank Account Verification",
  icon: TaxInclusive,
};

export default CustomerBankAccountVerificationListTable;
