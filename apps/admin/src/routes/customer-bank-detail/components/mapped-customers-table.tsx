import { useMemo } from "react";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { Container, Heading } from "@medusajs/ui";
import { keepPreviousData } from "@tanstack/react-query";
import { _DataTable, useDataTable } from "@mercurjs/dashboard-shared";
import { useMappedCustomersForBankDetail } from "../../../hooks/api/customer-bank-detail";
import { useMappedCustomersTableQuery } from "../../../hooks/table/query/use-mapped-customers-table-query";
import type { MappedCustomerRow } from "../types";

type MappedCustomersTableProps = {
  bankDetailId: string;
};

const columnHelper = createColumnHelper<MappedCustomerRow>();
const PAGE_SIZE = 10;

const useMappedCustomersTableColumns = () =>
  useMemo(
    () =>
      [
        columnHelper.accessor("first_name", {
          header: "First Name",
          cell: ({ getValue }) => getValue() ?? "–",
        }),
        columnHelper.accessor("email", {
          header: "Email",
          cell: ({ getValue }) => getValue() ?? "–",
        }),
        columnHelper.accessor("phone", {
          header: "Phone",
          cell: ({ getValue }) => getValue() ?? "–",
        }),
        columnHelper.accessor("customer_id", {
          header: "Customer ID",
          cell: ({ getValue }) => <span className="font-mono text-xs">{getValue() ?? "–"}</span>,
        }),
      ] as ColumnDef<MappedCustomerRow>[],
    []
  );

export const MappedCustomersTable = ({ bankDetailId }: MappedCustomersTableProps) => {
  const { searchParams, raw } = useMappedCustomersTableQuery({
    prefix: "mapped_customers",
    pageSize: PAGE_SIZE,
  });

  const { mappedCustomers, count, isError, error, isFetching } = useMappedCustomersForBankDetail(
    bankDetailId,
    {
      offset: searchParams.offset,
      limit: searchParams.limit,
    },
    { placeholderData: keepPreviousData }
  );

  const columns = useMappedCustomersTableColumns();

  const { table } = useDataTable({
    data: mappedCustomers ?? [],
    columns,
    enablePagination: true,
    count,
    pageSize: PAGE_SIZE,
    prefix: "mapped_customers",
    getRowId: (row) => row.id,
  });

  if (isError) {
    throw error;
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Mapped Customers</Heading>
      </div>
      <_DataTable
        columns={columns}
        table={table}
        pagination
        count={count}
        isLoading={isFetching}
        pageSize={PAGE_SIZE}
        queryObject={raw}
        noRecords={{
          message: "No mapped customers found.",
        }}
      />
    </Container>
  );
};
