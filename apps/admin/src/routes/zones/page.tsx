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
import { PencilSquare, Plus, Eye, MapPin } from "@medusajs/icons";

import { ActionsButton } from "../../common/ActionsButton";
import { createColumnHelper } from "@tanstack/react-table";
import { useZones } from "../../hooks/api/zones";
import { Zone } from "./types";
import ZoneFormModal from "./create/zone-form-modal";

const PAGE_SIZE = 20;

const ZonesListPage = () => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
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

  const { data, isLoading, error, refetch } = useZones({
    limit: pagination.pageSize,
    offset,
    q: debouncedSearch,
  });
  const zones = data?.zones || [];
  const totalCount = data?.count ?? zones.length;

  const handleCreateSuccess = () => {
    refetch();
  };

  const handleEditSuccess = () => {
    refetch();
    setEditingZone(null);
  };

  const handleEditZone = (zone: Zone) => {
    setEditingZone(zone);
    setEditModalOpen(true);
  };

  // Handle error state
  if (error) {
    return (
      <Container>
        <div className="flex size-full flex-col items-center justify-center py-16">
          <Text className="text-ui-fg-muted">Failed to load zones. Please try again.</Text>
        </div>
      </Container>
    );
  }


  const columns = useColumns(handleEditZone);

  const navigate = useNavigate();

  const table = useDataTable({
    data: zones || [],
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
    onRowClick: (_event, row: Zone) => {
      navigate(`/zones/${row.id}`);
    },
  });

  // Handle empty state only when there is no active search.
  // When a search query yields no results, we still want to show the table
  // layout with the search input crossso the user can adjust their query.
  if (!isLoading && zones.length === 0 && !debouncedSearch) {
    return (
      <Container>
        <div className="flex size-full flex-col overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b">
            <Heading>Zones</Heading>
            <Button onClick={() => setCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Create Zone
            </Button>
          </div>
          <div className="flex size-full flex-col items-center justify-center py-16">
            <Text className="text-ui-fg-muted mb-4">No zones found</Text>
            <Button onClick={() => setCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Create your first zone
            </Button>
          </div>
        </div>

        {/* Create Zone Modal */}
        <ZoneFormModal
          open={createModalOpen}
          onOpenChange={setCreateModalOpen}
          onSuccess={handleCreateSuccess}
          isEdit={false}
        />

        {/* Edit Zone Modal */}
        <ZoneFormModal
          open={editModalOpen}
          onOpenChange={(open) => {
            setEditModalOpen(open);
            if (!open) {
              setEditingZone(null);
            }
          }}
          onSuccess={handleEditSuccess}
          zone={editingZone || undefined}
          isEdit={!!editingZone}
        />
      </Container>
    );
  }

  return (
    <Container>
      <div className="flex size-full flex-col overflow-hidden">
        <DataTable instance={table}>
          <DataTable.Toolbar className="flex flex-col items-start justify-between gap-2 md:flex-row md:items-center">
            <Heading>Zones</Heading>
            <div className="flex gap-2">
              <Button onClick={() => setCreateModalOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Create Zone
              </Button>
              <DataTable.Search placeholder="Search zones..." />
            </div>
          </DataTable.Toolbar>
          <DataTable.Table />
          <DataTable.Pagination />
        </DataTable>
      </div>
      
      {/* Create Zone Modal */}
      <ZoneFormModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={handleCreateSuccess}
        isEdit={false}
      />

      {/* Edit Zone Modal */}
      <ZoneFormModal
        open={editModalOpen}
        onOpenChange={(open) => {
          setEditModalOpen(open);
          if (!open) {
            setEditingZone(null);
          }
        }}
        onSuccess={handleEditSuccess}
        zone={editingZone || undefined}
        isEdit={!!editingZone}
      />
    </Container>
  );
};

export const config: RouteConfig = {
  label: "Zones",
  icon: MapPin,
};

const columnHelper = createColumnHelper<Zone>();

const useColumns = (onEditZone: (zone: Zone) => void) => {
  const navigate = useNavigate();

  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return (
        <Badge color="green" size="small">
          Active
        </Badge>
      );
    }
    
    // Inactive zones: reddish background with white font
    return (
      <Badge 
        className="text-white" 
        size="small"
        style={{ backgroundColor: 'rgb(255, 120, 121)', color: '#ffffff' }}
      >
        Inactive
      </Badge>
    );
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: "Name",
        cell: ({ getValue }) => (
          <Text className="font-medium">{getValue()}</Text>
        ),
      }),
             columnHelper.accessor("location_name", {
               header: "Location Name",
               cell: ({ getValue }) => (
                 <Text className="text-sm">{getValue() || '-'}</Text>
               ),
             }),
             columnHelper.display({
               id: "timing",
               header: "Timing",
               cell: ({ row }) => {
                 const startTime = row.original.start_time
                 const endTime = row.original.end_time
                 
                 if (!startTime || !endTime) {
                   return <Text className="text-xs text-ui-fg-muted">-</Text>
                 }
                 
                 return (
                   <Text className="text-xs">
                     {startTime} - {endTime}
                   </Text>
                 )
               },
             }),
      columnHelper.accessor("postcodes", {
        header: "Postcodes",
        cell: ({ getValue }) => (
          <Text className="text-xs">
            {getValue()?.length || 0} codes
          </Text>
        ),
      }),
      columnHelper.accessor("is_active", {
        header: "Status",
        cell: ({ getValue }) => getStatusBadge(getValue()),
      }),
      columnHelper.accessor("created_at", {
        header: "Created At",
        cell: ({ getValue }) => (
          <Text className="text-xs text-ui-fg-muted">
            {getValue() ? new Date(getValue()).toLocaleDateString() : '-'}
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
                  label: "View",
                  onClick: () => navigate(`/zones/${row.original.id}`),
                  icon: <Eye />
                },
                {
                  label: "Edit",
                  onClick: () => onEditZone(row.original),
                  icon: <PencilSquare />
                },
              ]}
            />
          );
        },
      }),
    ],
    [getStatusBadge, navigate, onEditZone]
  );

  return columns;
};

export default ZonesListPage;
