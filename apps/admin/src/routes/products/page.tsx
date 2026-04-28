import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { createColumnHelper } from "@tanstack/react-table";
import { PencilSquare, Trash } from "@medusajs/icons";
import { Avatar, Container, Heading, StatusBadge, Text, toast, usePrompt } from "@medusajs/ui";
import {
  _DataTable,
  type Filter,
  SingleColumnPage,
  useDataTable,
  useQueryParams,
} from "@mercurjs/dashboard-shared";
import { useCallback, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ActionsButton } from "../../common/ActionsButton";
import { client } from "../../lib/client";
import { EnhancedProductImport } from "./enhanced-import/enhanced-product-import";

type ProductRow = {
  id: string;
  title: string;
  handle?: string | null;
  status?: string;
  thumbnail?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  collection?: { id: string; title?: string | null } | null;
  sales_channels?: Array<{ id: string; name?: string | null }> | null;
  variants?: Array<{ id: string }> | null;
  sellers?: Array<{ id: string; name?: string | null }> | null;
};

const PAGE_SIZE = 20;
const PRODUCT_FIELDS =
  "id,title,handle,status,*collection,*sales_channels,variants.id,thumbnail,sellers.*,created_at,updated_at";

const columnHelper = createColumnHelper<ProductRow>();

const statusColor = (status?: string) => {
  switch ((status || "").toLowerCase()) {
    case "published":
      return "green" as const;
    case "draft":
      return "orange" as const;
    case "rejected":
      return "red" as const;
    default:
      return "grey" as const;
  }
};

const useProductsTableQuery = () => {
  const queryObject = useQueryParams(
    ["offset", "q", "order", "status", "created_at", "updated_at"],
    undefined
  );

  const { offset, q, order, status, created_at, updated_at } = queryObject;

  const searchParams: Record<string, unknown> = {
    limit: PAGE_SIZE,
    offset: offset ? Number(offset) : 0,
    q: q || undefined,
    order: order || "-updated_at",
    status: status ? String(status).split(",") : undefined,
    created_at: created_at ? JSON.parse(created_at) : undefined,
    updated_at: updated_at ? JSON.parse(updated_at) : undefined,
    fields: PRODUCT_FIELDS,
  };

  return { raw: queryObject, searchParams };
};

const useProductsTableFilters = (): Filter[] => {
  return useMemo(
    () => [
      {
        key: "status",
        label: "Status",
        type: "select",
        multiple: true,
        options: [
          { label: "Draft", value: "draft" },
          { label: "Published", value: "published" },
          { label: "Proposed", value: "proposed" },
          { label: "Rejected", value: "rejected" },
        ],
      },
      { key: "created_at", label: "Created At", type: "date" },
      { key: "updated_at", label: "Updated At", type: "date" },
    ],
    []
  );
};

const useProductsQuery = (searchParams: Record<string, unknown>) => {
  const { data, ...rest } = useQuery({
    queryKey: ["admin_products_override", searchParams],
    queryFn: async () => client.admin.products.query(searchParams as never),
    placeholderData: keepPreviousData,
  });

  return {
    products: (data as { products?: ProductRow[] } | undefined)?.products ?? [],
    count: (data as { count?: number } | undefined)?.count ?? 0,
    ...rest,
  };
};

const deleteProduct = async (id: string) => {
  const response = await fetch(`/admin/products/${id}`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      accept: "application/json",
    },
  });

  if (!response.ok) {
    const message = `Failed to delete product (${response.status})`;
    throw new Error(message);
  }
};

const ProductListHeader = ({ onOpenEnhancedImport }: { onOpenEnhancedImport: () => void }) => {
  const location = useLocation();

  return (
    <div className="flex items-center justify-between px-6 py-4">
      <Heading>Products</Heading>
      <div className="flex items-center gap-2">
        <Link
          to={`export${location.search}`}
          className="txt-compact-small-plus bg-ui-button-neutral text-ui-button-neutral-fg shadow-buttons-neutral hover:bg-ui-button-neutral-hover px-3 py-2 rounded-md"
        >
          Export
        </Link>
        <Link
          to={`import${location.search}`}
          className="txt-compact-small-plus bg-ui-button-neutral text-ui-button-neutral-fg shadow-buttons-neutral hover:bg-ui-button-neutral-hover px-3 py-2 rounded-md"
        >
          Import
        </Link>
        <button
          type="button"
          onClick={onOpenEnhancedImport}
          className="txt-compact-small-plus bg-ui-button-neutral text-ui-button-neutral-fg shadow-buttons-neutral hover:bg-ui-button-neutral-hover px-3 py-2 rounded-md"
        >
          Enhanced Import
        </button>
        <Link
          to="create"
          className="txt-compact-small-plus bg-ui-button-neutral text-ui-button-neutral-fg shadow-buttons-neutral hover:bg-ui-button-neutral-hover px-3 py-2 rounded-md"
        >
          Create
        </Link>
      </div>
    </div>
  );
};

const ProductsPage = () => {
  const queryClient = useQueryClient();
  const prompt = usePrompt();
  const [openEnhancedImport, setOpenEnhancedImport] = useState(false);
  const { raw, searchParams } = useProductsTableQuery();
  const { products, count, isLoading, isError, error } = useProductsQuery(searchParams);
  const filters = useProductsTableFilters();

  const handleDelete = useCallback(async (product: ProductRow) => {
    const confirmed = await prompt({
      title: "Delete product?",
      description: `Are you sure you want to delete "${product.title}"?`,
      confirmText: "Delete",
      cancelText: "Cancel",
    });

    if (!confirmed) {
      return;
    }

    try {
      await deleteProduct(product.id);
      await queryClient.invalidateQueries({ queryKey: ["admin_products_override"] });
      toast.success("Product deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete product");
    }
  }, [prompt, queryClient]);

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "product",
        header: () => (
          <div className="flex h-full w-full items-center">
            <span className="truncate">Products</span>
          </div>
        ),
        cell: ({ row }) => {
          const image = row.original.thumbnail || undefined;
          return (
            <div className="flex items-center gap-3">
              <Avatar src={image} fallback={row.original.title?.charAt(0) || "P"} />
              <Text size="small">{row.original.title}</Text>
            </div>
          );
        },
      }),
      columnHelper.display({
        id: "collection",
        header: () => (
          <div className="flex h-full w-full items-center">
            <span className="truncate">Collections</span>
          </div>
        ),
        cell: ({ row }) => <Text size="small">{row.original.collection?.title || "-"}</Text>,
      }),
      columnHelper.display({
        id: "sales_channels",
        header: () => (
          <div className="flex h-full w-full items-center">
            <span className="truncate">Sales Channels</span>
          </div>
        ),
        cell: ({ row }) => {
          const channels =
            row.original.sales_channels
              ?.map((channel) => channel.name?.trim() || channel.id)
              .filter(Boolean)
              .join(", ") || "-";
          return <Text size="small">{channels}</Text>;
        },
      }),
      columnHelper.display({
        id: "sellers",
        header: () => (
          <div className="flex h-full w-full items-center">
            <span className="truncate">Sellers</span>
          </div>
        ),
        cell: ({ row }) => {
          const names =
            row.original.sellers
              ?.map((s) => s.name?.trim() || s.id)
              .filter(Boolean)
              .join(", ") || "-";
          return <Text size="small">{names}</Text>;
        },
      }),
      columnHelper.display({
        id: "variants",
        header: () => (
          <div className="flex h-full w-full items-center">
            <span className="truncate">Variants</span>
          </div>
        ),
        cell: ({ row }) => (
          <Text size="small">{row.original.variants?.length ? `${row.original.variants.length} variants` : "-"}</Text>
        ),
      }),
      columnHelper.display({
        id: "status",
        header: () => (
          <div className="flex h-full w-full items-center">
            <span className="truncate">Status</span>
          </div>
        ),
        cell: ({ row }) => (
          <StatusBadge color={statusColor(row.original.status)}>
            {row.original.status || "unknown"}
          </StatusBadge>
        ),
      }),
      columnHelper.display({
        id: "actions",
        header: () => (
          <div className="flex h-full w-full items-center justify-end">
            <span className="truncate" />
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex justify-end">
            <ActionsButton
              actions={[
                {
                  label: "Edit",
                  icon: <PencilSquare />,
                  onClick: () => {
                    window.location.href = `/products/${row.original.id}/edit`;
                  },
                },
                {
                  label: "Delete",
                  icon: <Trash />,
                  onClick: () => {
                    void handleDelete(row.original);
                  },
                },
              ]}
            />
          </div>
        ),
      }),
    ],
    [handleDelete]
  );

  const { table } = useDataTable({
    data: products,
    columns,
    count,
    enablePagination: true,
    pageSize: PAGE_SIZE,
    getRowId: (row) => row.id,
  });

  if (isError) {
    throw error;
  }

  return (
    <SingleColumnPage data-testid="custom-products-page">
      <Container className="divide-y p-0">
        <ProductListHeader onOpenEnhancedImport={() => setOpenEnhancedImport(true)} />
        <_DataTable
          columns={columns}
          table={table}
          count={count}
          pageSize={PAGE_SIZE}
          isLoading={isLoading}
          queryObject={raw}
          pagination
          search
          filters={filters}
          navigateTo={(row) => `/products/${row.original.id}`}
          orderBy={[
            { key: "title", label: "Title" },
            { key: "created_at", label: "Created At" },
            { key: "updated_at", label: "Updated At" },
          ]}
          noRecords={{ message: "No products found" }}
        />
      </Container>
      <EnhancedProductImport
        open={openEnhancedImport}
        onOpenChange={setOpenEnhancedImport}
        onImported={() => {
          void queryClient.invalidateQueries({ queryKey: ["admin_products_override"] });
        }}
      />
    </SingleColumnPage>
  );
};

export default ProductsPage;
