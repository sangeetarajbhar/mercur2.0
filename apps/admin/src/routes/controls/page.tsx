import {
  Container,
  Heading,
  Button,
  Text,
  Badge,
  DataTable,
  useDataTable,
  DataTablePaginationState,
} from "@medusajs/ui";
import type { RouteConfig } from "@mercurjs/dashboard-sdk";
import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PencilSquare, Plus, SquaresPlus } from "@medusajs/icons";

import { ActionsButton } from "../../common/ActionsButton";
import { createColumnHelper } from "@tanstack/react-table";
import { useControls } from "../../hooks/api/controls";
import { Control } from "./types";

const PAGE_SIZE = 50;

const ControlsListPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pagination, setPagination] = useState<DataTablePaginationState>({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  });

  // Debounce search to prevent too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      // Reset pagination when search changes
      setPagination(prev => ({ ...prev, pageIndex: 0 }));
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  const offset = pagination.pageIndex * pagination.pageSize;

  const { data, isLoading } = useControls({
    limit: pagination.pageSize,
    offset,
    q: debouncedSearch,
  });
  const controls = data?.controls || [];
  const totalCount = data?.count ?? controls.length;

  // Debug logging
  // console.log("Search state:", { search, debouncedSearch, controls: controls.length });

  const columns = useColumns();

  const table = useDataTable({
    data: controls || [],
    columns,
    rowCount: totalCount,
    isLoading,
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

  return (
    <Container>
      <div className="flex size-full flex-col overflow-hidden">
        <DataTable instance={table}>
          <DataTable.Toolbar className="flex flex-col items-start justify-between gap-2 md:flex-row md:items-center">
            <Heading>Controls</Heading>
            <div className="flex gap-2">
              <Button onClick={() => navigate('/controls/create')}>
                <Plus className="h-4 w-4 mr-1" />
                Create Control
              </Button>
              <DataTable.Search placeholder="Search controls..." />
            </div>
          </DataTable.Toolbar>
          <DataTable.Table />
          <DataTable.Pagination />
        </DataTable>
      </div>
    </Container>
  );
};

export const config: RouteConfig = {
  label: "Controls",
  icon: SquaresPlus,
};

const columnHelper = createColumnHelper<Control>();

const useColumns = () => {
  const navigate = useNavigate();

  const getScopeBadgeColor = (scope: string) => {
    switch (scope) {
      case 'zone':
        return 'blue';
      case 'darkstore':
        return 'green';
      default:
        return 'grey';
    }
  };

  const getStatusBadge = (isEnabled: boolean, scope?: string) => {
    if (isEnabled) {
      return (
        <Badge color="green" size="small">
          Enabled
        </Badge>
      );
    }
    
    // Zone disabled buttons: reddish background with white font
    if (scope === 'zone') {
      return (
        <Badge 
          className="text-white" 
          size="small"
          style={{ backgroundColor: 'rgb(255, 120, 121)', color: '#ffffff' }}
        >
          Disabled
        </Badge>
      );
    }
    
    // Darkstore disabled buttons: standard red
    return (
      <Badge color="red" size="small">
        Disabled
      </Badge>
    );
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor("scope", {
        header: "Scope",
        cell: ({ getValue }) => (
          <Badge color={getScopeBadgeColor(getValue())} size="small">
            {getValue()}
          </Badge>
        ),
      }),
      columnHelper.accessor("scope_id", {
        header: "Scope Target",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <Text className="text-sm">{row.original.scope_name || "-"}</Text>
            {/* <Text className="font-mono text-xxs text-ui-fg-muted">{getValue()}</Text> */}
          </div>
        ),
      }),
      columnHelper.accessor("is_active", {
        header: "Status",
        cell: ({ getValue, row }) => getStatusBadge(getValue(), row.original.scope),
      }),
      columnHelper.accessor("is_instant_enabled", {
        header: "Instant Promise",
        cell: ({ getValue, row }) => getStatusBadge(getValue(), row.original.scope),
      }),
      columnHelper.accessor("is_slotted_enabled", {
        header: "Slotted Delivery",
        cell: ({ getValue, row }) => getStatusBadge(getValue(), row.original.scope),
      }),
      columnHelper.accessor("delay_minutes", {
        header: "Delay (minutes)",
        cell: ({ getValue }) => <Text>{getValue()}</Text>,
      }),
      columnHelper.accessor("delay_message", {
        header: "Delay Message",
        cell: ({ getValue }) => (
          <Text className="max-w-[200px] truncate">
            {getValue() || '-'}
          </Text>
        ),
      }),
      columnHelper.accessor("created_at", {
        header: "Created",
        cell: ({ getValue }) => (
          <Text className="text-xs text-ui-fg-muted">
            {new Date(getValue()).toLocaleDateString()}
          </Text>
        ),
      }),
      columnHelper.display({
        id: "actions",
        cell: ({ row }) => {
          return (
            <ActionsButton
              actions={[
                {
                  label: "Edit",
                  onClick: () => navigate(`/controls/${row.original.id}/edit`),
                  icon: <PencilSquare />
                },
              ]}
            />
          )
        },
      }),
    ],
    [navigate]
  )

  return columns
}

export default ControlsListPage;