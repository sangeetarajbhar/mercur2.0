import { useMemo, useState } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import {
  Container,
  Heading,
  Text,
  DataTable,
  useDataTable,
  DataTablePaginationState,
} from "@medusajs/ui";
import { keepPreviousData } from "@tanstack/react-query";
import { useMappedCustomers } from "../../../hooks/api/customer-upi-detail";
import type { MappedCustomerRow } from "../types";

type MappedCustomersTableProps = {
  upiDetailId: string;
};

const columnHelper = createColumnHelper<MappedCustomerRow>();

const PAGE_SIZE = 10;

const useMappedCustomersTableColumns = () =>
  useMemo(
    () => [
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
        cell: ({ getValue }) => (
          <span className="font-mono text-xs">{getValue() ?? "–"}</span>
        ),
      }),
    ],
    []
  );

export const MappedCustomersTable = ({
  upiDetailId,
}: MappedCustomersTableProps) => {
  const [pagination, setPagination] = useState<DataTablePaginationState>({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  });

  const offset = pagination.pageIndex * pagination.pageSize;

  const { mappedCustomers, count, isError, error, isFetching } =
    useMappedCustomers(
      upiDetailId,
      {
        offset,
        limit: pagination.pageSize,
      },
      {
        placeholderData: keepPreviousData,
      }
    );

  const columns = useMappedCustomersTableColumns();

  const table = useDataTable({
    data: mappedCustomers ?? [],
    columns,
    rowCount: count,
    isLoading: isFetching && mappedCustomers.length === 0,
    pagination: {
      state: pagination,
      onPaginationChange: setPagination,
    },
    getRowId: (row) => row.id,
  });

  if (isError) {
    throw error;
  }

  if (isFetching && mappedCustomers.length === 0) {
    return (
      <Container className="divide-y divide-dashed p-0">
        <div className="flex items-center justify-center px-6 py-12">
          <Text className="text-ui-fg-subtle">
            Loading mapped customers...
          </Text>
        </div>
      </Container>
    );
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Mapped Customers</Heading>
      </div>
      <DataTable instance={table}>
        <DataTable.Table />
        <DataTable.Pagination />
      </DataTable>
    </Container>
  );
};
