import type { RouteConfig } from "@mercurjs/dashboard-sdk";
import {
  Container,
  Heading,
  Button,
  Text,
  Badge,
  DataTable,
  useDataTable,
  DataTablePaginationState,
  toast,
} from "@medusajs/ui";
import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PencilSquare, Plus, Trash, Trophy } from "@medusajs/icons";
import { createColumnHelper } from "@tanstack/react-table";

import { ActionsButton } from "../../common/ActionsButton";
import { useTiers, useDeleteTier } from "../../hooks/api/tiers";
import { Tier } from "./types";
import TierFormModal from "./create/tier-form-modal";

const PAGE_SIZE = 20;

const TiersListPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<Tier | null>(null);
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

  const { data, isLoading, error, refetch } = useTiers({
    fields:
      "id,name,promo_id,tier_rules.*,promotion.id,promotion.code,promotion.status",
    limit: pagination.pageSize,
    offset,
    q: debouncedSearch,
  });
  const tiers = data?.tiers || [];
  const totalCount = data?.count ?? tiers.length;

  const deleteTier = useDeleteTier();

  const handleCreateSuccess = (tierId?: string) => {
    refetch();
    setCreateModalOpen(false);
    if (tierId) {
      navigate(`/tiers/${tierId}`);
    }
  };

  const handleEditSuccess = () => {
    refetch();
    setEditingTier(null);
    setEditModalOpen(false);
  };

  const handleEditTier = (tier: Tier) => {
    setEditingTier(tier);
    setEditModalOpen(true);
  };

  const handleDeleteTier = async (tier: Tier) => {
    if (
      !confirm(
        `Are you sure you want to delete tier "${tier.name}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      await deleteTier.mutateAsync(tier.id);
      toast.success("Tier deleted successfully");
      refetch();
    } catch (err) {
      toast.error((err as Error).message || "Failed to delete tier");
    }
  };

  const columns = useColumns(handleEditTier, handleDeleteTier, navigate);

  const table = useDataTable({
    data: tiers || [],
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
    onRowClick: (_event, row) => {
      navigate(`/tiers/${row.id}`);
    },
  });

  if (error) {
    return (
      <Container>
        <div className="flex size-full flex-col items-center justify-center py-16">
          <Text className="text-ui-fg-muted">
            Failed to load tiers. Please try again.
          </Text>
        </div>
      </Container>
    );
  }

  if (!isLoading && tiers.length === 0 && !debouncedSearch) {
    return (
      <Container>
        <div className="flex size-full flex-col overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b">
            <Heading>Tiers</Heading>
            <Button onClick={() => setCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Create Tier
            </Button>
          </div>
          <div className="flex size-full flex-col items-center justify-center py-16">
            <Text className="text-ui-fg-muted mb-4">No tiers found</Text>
            <Button onClick={() => setCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Create your first tier
            </Button>
          </div>
        </div>

        <TierFormModal
          open={createModalOpen}
          onOpenChange={setCreateModalOpen}
          onSuccess={handleCreateSuccess}
          isEdit={false}
        />
      </Container>
    );
  }

  return (
    <Container>
      <div className="flex size-full flex-col overflow-hidden">
        <DataTable instance={table}>
          <DataTable.Toolbar className="flex flex-col items-start justify-between gap-2 md:flex-row md:items-center">
            <Heading>Tiers</Heading>
            <div className="flex gap-2">
              <Button onClick={() => setCreateModalOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Create Tier
              </Button>
              <DataTable.Search placeholder="Search tiers..." />
            </div>
          </DataTable.Toolbar>
          <DataTable.Table />
          <DataTable.Pagination />
        </DataTable>
      </div>

      <TierFormModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onSuccess={handleCreateSuccess}
        isEdit={false}
      />

      <TierFormModal
        open={editModalOpen}
        onOpenChange={(openState) => {
          setEditModalOpen(openState);
          if (!openState) {
            setEditingTier(null);
          }
        }}
        onSuccess={handleEditSuccess}
        tier={editingTier || undefined}
        isEdit={!!editingTier}
      />
    </Container>
  );
};

export const config: RouteConfig = {
  label: "Tiers",
  icon: Trophy,
};

const columnHelper = createColumnHelper<Tier>();

const useColumns = (
  onEditTier: (tier: Tier) => void,
  onDeleteTier: (tier: Tier) => void,
  navigate: (path: string) => void
) => {
  return useMemo(
    () => [
      columnHelper.accessor("name", {
        header: "Name",
        cell: ({ getValue }) => (
          <Text className="font-medium">{getValue()}</Text>
        ),
      }),
      columnHelper.accessor("promotion", {
        header: "Promotion",
        cell: ({ getValue }) => {
          const promotion = getValue();
          if (!promotion) {
            return <Text className="text-sm text-ui-fg-muted">-</Text>;
          }
          return (
            <div className="flex items-center gap-2">
              <Badge color={promotion.status === "active" ? "green" : "grey"}>
                {promotion.code}
              </Badge>
              <Text className="text-xs text-ui-fg-muted">
                {promotion.status}
              </Text>
            </div>
          );
        },
      }),
      columnHelper.accessor("tier_rules", {
        header: "Rules",
        cell: ({ getValue }) => {
          const rules = getValue() || [];
          if (rules.length === 0) {
            return <Text className="text-sm text-ui-fg-muted">No rules</Text>;
          }
          return (
            <div className="flex flex-col gap-1">
              {rules.map((rule, index) => (
                <Text key={index} className="text-xs">
                  {rule.currency_code.toUpperCase()}: {rule.min_purchase_value}
                </Text>
              ))}
            </div>
          );
        },
      }),
      columnHelper.display({
        id: "actions",
        cell: ({ row }) => {
          return (
            <ActionsButton
              actions={[
                {
                  label: "View Details",
                  onClick: () => {
                    navigate(`/tiers/${row.original.id}`);
                  },
                },
                {
                  label: "Edit",
                  onClick: () => onEditTier(row.original),
                  icon: <PencilSquare />,
                },
                {
                  label: "Delete",
                  onClick: () => onDeleteTier(row.original),
                  icon: <Trash />,
                },
              ]}
            />
          );
        },
      }),
    ],
    [onEditTier, onDeleteTier, navigate]
  );
};

export default TiersListPage;
