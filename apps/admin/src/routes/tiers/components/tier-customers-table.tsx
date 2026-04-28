import {
  Heading,
  DataTable,
  createDataTableColumnHelper,
  useDataTable,
  Container,
  DataTablePaginationState,
  Button,
} from "@medusajs/ui";
import { useMemo, useState } from "react";
import { ArrowUpTray } from "@medusajs/icons";

import { useTierCustomers, TierCustomer } from "../../../hooks/api/tiers";
import { TierAssignCustomersModal } from "./tier-assign-customers-modal";

type TierCustomersTableProps = {
  tierId: string;
};

const columnHelper = createDataTableColumnHelper<TierCustomer>();

const columns = [
  columnHelper.accessor("email", {
    header: "Email",
  }),
  columnHelper.accessor("first_name", {
    header: "Name",
    cell: ({ row }) => {
      const customer = row.original;
      return customer.first_name || customer.last_name
        ? `${customer.first_name || ""} ${customer.last_name || ""}`.trim()
        : "-";
    },
  }),
];

export const TierCustomersTable = ({ tierId }: TierCustomersTableProps) => {
  const limit = 15;
  const [pagination, setPagination] = useState<DataTablePaginationState>({
    pageSize: limit,
    pageIndex: 0,
  });
  const [assignModalOpen, setAssignModalOpen] = useState(false);

  const offset = useMemo(() => {
    return pagination.pageIndex * limit;
  }, [pagination]);

  const { data: customersData, isLoading: customersLoading } = useTierCustomers(
    tierId,
    { limit, offset }
  );

  const table = useDataTable({
    columns,
    data: customersData?.customers || [],
    getRowId: (customer) => customer.id,
    rowCount: customersData?.count || 0,
    isLoading: customersLoading,
    pagination: {
      state: pagination,
      onPaginationChange: setPagination,
    },
  });

  return (
    <>
      <Container className="divide-y p-0">
        <DataTable instance={table}>
          <DataTable.Toolbar className="flex items-center justify-between px-6 py-4">
            <Heading level="h2">Customers in this Tier</Heading>
            <Button
              variant="secondary"
              size="small"
              onClick={() => setAssignModalOpen(true)}
            >
              <ArrowUpTray className="mr-1" />
              Assign Customers
            </Button>
          </DataTable.Toolbar>
          <DataTable.Table />
          <DataTable.Pagination />
        </DataTable>
      </Container>

      <TierAssignCustomersModal
        tierId={tierId}
        open={assignModalOpen}
        onOpenChange={setAssignModalOpen}
      />
    </>
  );
};
