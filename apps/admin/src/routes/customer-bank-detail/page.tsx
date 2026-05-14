import { Container, Heading } from "@medusajs/ui";
import type { RouteConfig } from "@mercurjs/dashboard-sdk";
import { CreditCard } from "@medusajs/icons";
import { keepPreviousData } from "@tanstack/react-query";
import { _DataTable, SingleColumnPage, useDataTable } from "@mercurjs/dashboard-shared";
import { useCustomerBankDetailListTableFilters } from "./helpers/customer-bank-detail-list-table-filters";
import { useCustomerBankDetailListTableColumns } from "./components/use-customer-bank-detail-list-table-columns";
import { useCustomerBankDetailListTableQuery } from "../../hooks/table/query/use-customer-bank-detail-table-query";
import { useCustomerBankDetails } from "../../hooks/api/customer-bank-detail";

const PAGE_SIZE = 10;

const CustomerBankDetailListTable = () => {
  const { searchParams, raw } = useCustomerBankDetailListTableQuery({
    pageSize: PAGE_SIZE,
  });

  const { customerBankDetails, count, isError, error, isFetching } = useCustomerBankDetails(
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

  const filters = useCustomerBankDetailListTableFilters();
  const columns = useCustomerBankDetailListTableColumns({});

  const { table } = useDataTable({
    data: customerBankDetails ?? [],
    columns,
    enablePagination: true,
    count,
    pageSize: PAGE_SIZE,
  });

  if (isError) {
    throw error;
  }

  return (
    <SingleColumnPage>
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading>Customer Bank Details</Heading>
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
  label: "Customer Bank Details",
  icon: CreditCard,
};

export default CustomerBankDetailListTable;
