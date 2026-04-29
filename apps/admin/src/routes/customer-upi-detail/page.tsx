import {
  Container,
  Heading,
  DataTable,
  useDataTable,
  DataTablePaginationState,
} from "@medusajs/ui";
import type { RouteConfig } from "@mercurjs/dashboard-sdk";
import { CreditCard } from "@medusajs/icons";
import { keepPreviousData } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useCustomerUpiDetailListTableColumns } from "./components/use-customer-upi-detail-list-table-columns";
import { useCustomerUpiDetails } from "../../hooks/api/customer-upi-detail";

const PAGE_SIZE = 20;

const CustomerUpiDetailListTable = () => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pagination, setPagination] = useState<DataTablePaginationState>({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const offset = pagination.pageIndex * pagination.pageSize;

  const { customerUpiDetails, count, isError, error, isFetching } =
    useCustomerUpiDetails(
      {
        offset,
        limit: pagination.pageSize,
        q: debouncedSearch,
      },
      {
        placeholderData: keepPreviousData,
      }
    );

  const columns = useCustomerUpiDetailListTableColumns({});

  const table = useDataTable({
    data: customerUpiDetails ?? [],
    columns,
    rowCount: count,
    isLoading: isFetching,
    pagination: {
      state: pagination,
      onPaginationChange: setPagination,
    },
    search: {
      state: search,
      onSearchChange: setSearch,
    },
    getRowId: (row) => row?.id || "",
  });

  if (isError) {
    throw error;
  }

  return (
    <Container>
      <div className="flex size-full flex-col overflow-hidden">
        <DataTable instance={table}>
          <DataTable.Toolbar className="flex flex-col items-start justify-between gap-2 md:flex-row md:items-center">
            <Heading>Customer Upi Details</Heading>
            <DataTable.Search placeholder="Search UPI details..." />
          </DataTable.Toolbar>
          <DataTable.Table />
          <DataTable.Pagination />
        </DataTable>
      </div>
    </Container>
  );
};

export const config: RouteConfig = {
  label: "Customer Upi Details",
  icon: CreditCard,
};

export default CustomerUpiDetailListTable;
