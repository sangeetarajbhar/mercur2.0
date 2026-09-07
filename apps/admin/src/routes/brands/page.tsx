import type { RouteConfig } from "@mercurjs/dashboard-sdk";
import {
  Container,
  Heading,
  Button,
  Text,
  Input,
  Label,
  DataTable,
  useDataTable,
  DataTablePaginationState,
  Badge,
} from "@medusajs/ui";
import { useState, useEffect, useMemo } from "react";
import { TagSolid, Plus, PencilSquare, Trash } from "@medusajs/icons";
import { createColumnHelper } from "@tanstack/react-table";

import {
  useBrands,
  useCreateBrand,
  useUpdateBrand,
  useDeleteBrand,
  Brand,
} from "../../hooks/api/brands";

const PAGE_SIZE = 20;

const BrandsListPage = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");
  const [newBrandHandle, setNewBrandHandle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [currentBrand, setCurrentBrand] = useState<Brand | null>(null);
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

  const { data, isLoading } = useBrands({
    limit: pagination.pageSize,
    offset,
    q: debouncedSearch,
  });

  const brands = data?.brands || [];
  const totalCount = data?.count ?? brands.length;

  const createBrand = useCreateBrand();
  const updateBrand = useUpdateBrand(currentBrand?.id || "");
  const deleteBrand = useDeleteBrand();

  const handleCreateBrand = async () => {
    if (!newBrandName) {
      setError("Brand name is required");
      return;
    }

    try {
      setError(null);
      await createBrand.mutateAsync({
        name: newBrandName,
        handle: newBrandHandle || undefined,
      });
      setNewBrandName("");
      setNewBrandHandle("");
      setIsCreateDialogOpen(false);
    } catch (err) {
      setError(
        typeof err === "object" && err !== null && "message" in err
          ? ((err as Error).message as string)
          : "An unknown error occurred"
      );
    }
  };

  const handleEditBrand = async () => {
    if (!currentBrand || !newBrandName) {
      setError("Brand name is required");
      return;
    }

    try {
      setError(null);
      await updateBrand.mutateAsync({
        name: newBrandName,
        handle: newBrandHandle || undefined,
      });
      setNewBrandName("");
      setNewBrandHandle("");
      setIsEditDialogOpen(false);
      setCurrentBrand(null);
    } catch (err) {
      setError(
        typeof err === "object" && err !== null && "message" in err
          ? ((err as Error).message as string)
          : "An unknown error occurred"
      );
    }
  };

  const handleDeleteBrand = async (brandId: string) => {
    if (!confirm("Are you sure you want to delete this brand?")) {
      return;
    }

    try {
      await deleteBrand.mutateAsync(brandId);
    } catch {
      alert("Failed to delete brand");
    }
  };

  const openEditDialog = (brand: Brand) => {
    setCurrentBrand(brand);
    setNewBrandName(brand.name);
    setNewBrandHandle(brand.handle || "");
    setError(null);
    setIsEditDialogOpen(true);
  };

  const columns = useColumns(openEditDialog, handleDeleteBrand);

  const table = useDataTable({
    data: brands,
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
            <Heading>Brands</Heading>
            <div className="flex gap-2">
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Create Brand
              </Button>
              <DataTable.Search placeholder="Search brands..." />
            </div>
          </DataTable.Toolbar>
          <DataTable.Table />
          <DataTable.Pagination />
        </DataTable>

        {isCreateDialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-lg bg-ui-bg-base p-6 shadow-lg">
              <div className="flex justify-between items-center mb-4">
                <Heading level="h2">Create New Brand</Heading>
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setNewBrandName("");
                    setNewBrandHandle("");
                    setError(null);
                  }}
                >
                  Close
                </Button>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded mb-4">
                  {error}
                </div>
              )}

              <div className="mb-4">
                <Label htmlFor="brand-name">Brand Name *</Label>
                <Input
                  id="brand-name"
                  placeholder="Enter brand name"
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="mb-6">
                <Label htmlFor="brand-handle">Brand Handle</Label>
                <Input
                  id="brand-handle"
                  placeholder="Enter brand handle (optional)"
                  value={newBrandHandle}
                  onChange={(e) => setNewBrandHandle(e.target.value)}
                  className="w-full"
                />
                <Text className="text-xs text-ui-fg-subtle mt-1">
                  If left empty, handle will be generated from the brand name
                </Text>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setNewBrandName("");
                    setNewBrandHandle("");
                    setError(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleCreateBrand}
                  disabled={createBrand.isPending}
                >
                  {createBrand.isPending ? "Creating..." : "Create Brand"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {isEditDialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-lg bg-ui-bg-base p-6 shadow-lg">
              <div className="flex justify-between items-center mb-4">
                <Heading level="h2">Edit Brand</Heading>
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setNewBrandName("");
                    setNewBrandHandle("");
                    setCurrentBrand(null);
                    setError(null);
                  }}
                >
                  Close
                </Button>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded mb-4">
                  {error}
                </div>
              )}

              <div className="mb-4">
                <Label htmlFor="edit-brand-name">Brand Name *</Label>
                <Input
                  id="edit-brand-name"
                  placeholder="Enter brand name"
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="mb-6">
                <Label htmlFor="edit-brand-handle">Brand Handle</Label>
                <Input
                  id="edit-brand-handle"
                  placeholder="Enter brand handle (optional)"
                  value={newBrandHandle}
                  onChange={(e) => setNewBrandHandle(e.target.value)}
                  className="w-full"
                />
                <Text className="text-xs text-ui-fg-subtle mt-1">
                  If left empty, handle will be generated from the brand name
                </Text>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setNewBrandName("");
                    setNewBrandHandle("");
                    setCurrentBrand(null);
                    setError(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleEditBrand}
                  disabled={updateBrand.isPending}
                >
                  {updateBrand.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Container>
  );
};

const columnHelper = createColumnHelper<Brand>();

const useColumns = (
  onEdit: (brand: Brand) => void,
  onDelete: (id: string) => void
) => {
  return useMemo(
    () => [
      columnHelper.accessor("id", {
        header: "ID",
        cell: ({ getValue }) => (
          <Text className="font-mono text-xs">{getValue()}</Text>
        ),
      }),
      columnHelper.accessor("name", {
        header: "Name",
        cell: ({ getValue }) => <Text>{getValue()}</Text>,
      }),
      columnHelper.accessor("handle", {
        header: "Handle",
        cell: ({ getValue }) => (
          <Text className="text-ui-fg-subtle">{getValue() || "-"}</Text>
        ),
      }),
      columnHelper.accessor("is_active", {
        header: "Status",
        cell: ({ getValue }) => (
          <Badge color={getValue() ? "green" : "grey"} size="small">
            {getValue() ? "Active" : "Inactive"}
          </Badge>
        ),
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          return (
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="small"
                onClick={() => onEdit(row.original)}
              >
                <PencilSquare className="h-4 w-4" />
                Edit
              </Button>
              <Button
                variant="danger"
                size="small"
                onClick={() => onDelete(row.original.id)}
              >
                <Trash className="h-4 w-4" />
                Delete
              </Button>
            </div>
          );
        },
      }),
    ],
    [onEdit, onDelete]
  );
};

export const config: RouteConfig = {
  label: "Brands",
  icon: TagSolid,
};

export default BrandsListPage;
