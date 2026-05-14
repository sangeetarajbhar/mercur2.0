import { Container, Heading } from "@medusajs/ui";
import type { RouteConfig } from "@mercurjs/dashboard-sdk";
import { CashSolid } from "@medusajs/icons";
import { keepPreviousData } from "@tanstack/react-query";
import { _DataTable, SingleColumnPage, useDataTable } from "@mercurjs/dashboard-shared";
import { usePayoutTransactionsListTableQuery } from "../../hooks/table/query/use-payout-transactions-table-query";
import { usePayoutTransactions } from "../../hooks/api/payout-transactions";
import { usePayoutTransactionsListTableFilters } from "./helpers/payout-transactions-list-table-filters";
import { usePayoutTransactionsListTableColumns } from "./components/use-payout-transactions-list-table-columns";

const PAGE_SIZE = 20;

const PayoutTransactionsListTable = () => {
  const { searchParams, raw } = usePayoutTransactionsListTableQuery({
    pageSize: PAGE_SIZE,
  });

  const { payoutTransactions, count, isError, error, isFetching } = usePayoutTransactions(
    {
      offset: searchParams.offset,
      limit: searchParams.limit,
      q: searchParams.q,
      payout_mode: searchParams.payout_mode,
    },
    { placeholderData: keepPreviousData },
    {
      created_at: searchParams.created_at,
      updated_at: searchParams.updated_at,
      status: searchParams.status,
      sort: searchParams.order,
      payout_mode: searchParams.payout_mode,
    }
  );

  const filters = usePayoutTransactionsListTableFilters();
  const columns = usePayoutTransactionsListTableColumns({});

  const { table } = useDataTable({
    data: payoutTransactions ?? [],
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
          <Heading>Payout Transactions</Heading>
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
  label: "COD Payout Transactions",
  icon: CashSolid,
};

export default PayoutTransactionsListTable;
