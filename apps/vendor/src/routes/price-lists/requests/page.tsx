import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { createColumnHelper } from "@tanstack/react-table"
import {
  Button,
  Container,
  DataTable,
  DataTablePaginationState,
  Heading,
  StatusBadge,
  Text,
  useDataTable,
} from "@medusajs/ui"
import { ArrowPath, ArrowUpTray, DocumentText } from "@medusajs/icons"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"

import {
  PriceListRequest,
  usePriceListRequests,
} from "../../../hooks/api/price-list-requests"

export const config: RouteConfig = {
  label: "Import Requests",
  nested: "/price-lists",
}

export const handle = {
  breadcrumb: () => "Import Requests",
}

const PAGE_SIZE = 20

const columnHelper = createColumnHelper<PriceListRequest>()

const statusColor = (status: string) => {
  switch (status) {
    case "accepted":
      return "green" as const
    case "pending":
      return "orange" as const
    case "rejected":
      return "red" as const
    default:
      return "grey" as const
  }
}

const columns = [
  columnHelper.accessor("file_name", {
    header: "File",
    cell: ({ getValue }) => (
      <Text size="small" className="font-medium">
        {getValue() || "-"}
      </Text>
    ),
  }),
  columnHelper.accessor("data", {
    header: "Price List",
    cell: ({ getValue }) => {
      const d = getValue() as any
      const title = d?.title ?? "-"
      const priceCount = Array.isArray(d?.prices) ? d.prices.length : 0
      return (
        <div>
          <Text size="small" className="font-medium">
            {title}
          </Text>
          {priceCount > 0 && (
            <Text size="small" className="text-ui-fg-muted">
              {priceCount} price{priceCount !== 1 ? "s" : ""}
            </Text>
          )}
        </div>
      )
    },
  }),
  columnHelper.accessor("status", {
    header: "Status",
    cell: ({ getValue }) => {
      const s = getValue()
      return (
        <StatusBadge color={statusColor(s)}>
          {s.charAt(0).toUpperCase() + s.slice(1)}
        </StatusBadge>
      )
    },
  }),
  columnHelper.accessor("created_at", {
    header: "Submitted",
    cell: ({ getValue }) => (
      <Text size="small" className="text-ui-fg-muted">
        {new Date(getValue()).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </Text>
    ),
  }),
]

const STATUS_FILTERS = [
  { label: "All", value: "" },
  { label: "Pending", value: "pending" },
  { label: "Accepted", value: "accepted" },
  { label: "Rejected", value: "rejected" },
]

const PriceListRequestsPage = () => {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState<string>("pending")
  const [pagination, setPagination] = useState<DataTablePaginationState>({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  })

  const offset = pagination.pageIndex * pagination.pageSize

  const { data, isLoading, error, refetch } = usePriceListRequests({
    limit: PAGE_SIZE,
    offset,
    status: statusFilter || undefined,
  })

  const requests = data?.price_list_requests ?? []
  const totalCount = data?.count ?? 0

  const table = useDataTable({
    data: requests,
    columns,
    rowCount: totalCount,
    isLoading,
    pagination: {
      state: pagination,
      onPaginationChange: setPagination,
    },
    getRowId: (row) => row.id,
    onRowClick: (_e: React.MouseEvent, row: PriceListRequest) =>
      navigate(`/price-lists/requests/${row.id}`),
  })

  if (error) {
    return (
      <Container>
        <div className="flex size-full flex-col items-center justify-center py-16">
          <Text className="text-ui-fg-muted">
            Failed to load requests. Please try again.
          </Text>
          <Button
            variant="secondary"
            size="small"
            className="mt-4"
            onClick={() => refetch()}
          >
            <ArrowPath className="mr-1 h-4 w-4" />
            Retry
          </Button>
        </div>
      </Container>
    )
  }

  return (
    <Container>
      <div className="flex size-full flex-col overflow-hidden">
        <DataTable instance={table}>
          <DataTable.Toolbar className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
            <div>
              <Heading>Price List Import Requests</Heading>
              <Text size="small" className="text-ui-fg-muted">
                Your price list import history
              </Text>
            </div>
            <div className="flex items-center gap-2">
              {STATUS_FILTERS.map(({ label, value }) => (
                <Button
                  key={label}
                  size="small"
                  variant={statusFilter === value ? "primary" : "secondary"}
                  onClick={() => {
                    setStatusFilter(value)
                    setPagination((p) => ({ ...p, pageIndex: 0 }))
                  }}
                >
                  {label}
                </Button>
              ))}
              <Button size="small" variant="secondary" asChild>
                <Link to="import">
                  <ArrowUpTray className="mr-1 h-4 w-4" />
                  Import
                </Link>
              </Button>
            </div>
          </DataTable.Toolbar>
          <DataTable.Table />
          <DataTable.Pagination />
        </DataTable>

        {!isLoading && requests.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <DocumentText className="text-ui-fg-muted mb-4 h-12 w-12" />
            <Text className="text-ui-fg-muted">
              {statusFilter
                ? `No ${statusFilter} requests found`
                : "No price list import requests found"}
            </Text>
          </div>
        )}
      </div>
    </Container>
  )
}

export default PriceListRequestsPage
