import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { createColumnHelper } from "@tanstack/react-table"
import {
  Badge,
  Button,
  Container,
  DataTable,
  DataTablePaginationState,
  Heading,
  Input,
  Text,
  useDataTable,
} from "@medusajs/ui"
import { ArrowPath } from "@medusajs/icons"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import {
  WorkflowExecution,
  useWorkflowExecutions,
} from "../../../hooks/api/workflow-executions"

const PAGE_SIZE = 20

const columnHelper = createColumnHelper<WorkflowExecution>()

const STATUS_FILTERS = [
  { label: "All", value: "" },
  { label: "Not Started", value: "not_started" },
  { label: "Invoking", value: "invoking" },
  { label: "Waiting to Compensate", value: "waiting_to_compensate" },
  { label: "Compensating", value: "compensating" },
  { label: "Done", value: "done" },
  { label: "Failed", value: "failed" },
  { label: "Reverted", value: "reverted" },
]

const humanizeState = (state?: string) => {
  if (!state) return "-"
  return state
    .replace(/-/g, "_")
    .split("_")
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ")
}

const formatDateTime = (value?: string) => {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const statusColor = (state?: string): "green" | "red" | "orange" | "grey" => {
  const normalizedState = state?.replace(/-/g, "_")
  switch (normalizedState) {
    case "done":
      return "green"
    case "failed":
      return "red"
    case "invoking":
    case "waiting_to_compensate":
    case "compensating":
      return "orange"
    default:
      return "grey"
  }
}

const toRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object") return {}
  return value as Record<string, unknown>
}

const matchesState = (executionState: string | undefined, selectedState: string) => {
  if (!selectedState) return true
  if (!executionState) return false
  return executionState.replace(/-/g, "_") === selectedState
}

const getExecutionProgress = (execution?: WorkflowExecution) => {
  const steps = toRecord(toRecord(execution?.execution).steps)
  const actionableSteps = Object.values(steps)
    .map((step) => toRecord(step))
    .filter((step) => step.id !== "_root")

  const completed = actionableSteps.filter(
    (step) => toRecord(step.invoke).state === "done"
  ).length

  return { completed, total: actionableSteps.length }
}

const columns = [
  columnHelper.accessor("workflow_id", {
    header: "Workflow",
    cell: ({ getValue }) => (
      <Text size="small" className="font-medium">
        {getValue() || "-"}
      </Text>
    ),
  }),
  columnHelper.accessor("transaction_id", {
    header: "Transaction",
    cell: ({ getValue }) => (
      <Text size="small" className="font-mono text-xs text-ui-fg-muted">
        {getValue() || "-"}
      </Text>
    ),
  }),
  columnHelper.accessor("state", {
    header: "Status",
    cell: ({ getValue }) => (
      <Badge color={statusColor(getValue())} size="2xsmall">
        {humanizeState(getValue())}
      </Badge>
    ),
  }),
  columnHelper.display({
    id: "progress",
    header: "Progress",
    cell: ({ row }) => (
      <div className="flex items-center gap-x-2">
        <div className="flex items-center gap-x-[3px]">
          {Array.from({ length: getExecutionProgress(row.original).total }).map((_, index) => (
            <div
              key={index}
              className="bg-ui-bg-switch-off shadow-details-switch-background h-3 w-1.5 rounded-full"
            />
          ))}
        </div>
        <Text size="small" className="text-ui-fg-muted">
          {getExecutionProgress(row.original).completed}/{getExecutionProgress(row.original).total}
        </Text>
      </div>
    ),
  }),
  columnHelper.accessor("created_at", {
    header: "Started",
    cell: ({ getValue }) => (
      <Text size="small" className="text-ui-fg-muted">
        {formatDateTime(getValue())}
      </Text>
    ),
  }),
]

const WorkflowsSettingsPage = () => {
  const navigate = useNavigate()
  const [searchInput, setSearchInput] = useState("")
  const [querySearch, setQuerySearch] = useState("")
  const [stateFilter, setStateFilter] = useState("")
  const [pagination, setPagination] = useState<DataTablePaginationState>({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  })

  const offset = pagination.pageIndex * pagination.pageSize
  const query = useMemo(
    () => ({
      limit: pagination.pageSize,
      offset,
      order: "-created_at",
    }),
    [offset, pagination.pageSize]
  )

  const { workflow_executions, count, isLoading, error, refetch, isFetching } =
    useWorkflowExecutions(query)

  const filteredWorkflowExecutions = useMemo(() => {
    return workflow_executions.filter((item) => {
      const matchesStatus = !stateFilter || matchesState(item.state, stateFilter)

      if (!matchesStatus) return false
      if (!querySearch) return true

      const search = querySearch.toLowerCase()

      return (
        (item.workflow_id || "").toLowerCase().includes(search) ||
        (item.transaction_id || "").toLowerCase().includes(search) ||
        (item.id || "").toLowerCase().includes(search)
      )
    })
  }, [stateFilter, workflow_executions, querySearch])

  const table = useDataTable({
    data: filteredWorkflowExecutions,
    columns,
    rowCount: stateFilter ? filteredWorkflowExecutions.length : count,
    isLoading,
    getRowId: (row) => row.id || `${row.workflow_id}-${row.transaction_id}`,
    pagination: {
      state: pagination,
      onPaginationChange: setPagination,
    },
    onRowClick: (_e, row) => {
      if (row.id) {
        navigate(`/settings/workflows/${row.id}`)
      }
    },
  })

  return (
    <Container className="p-0">
      <DataTable instance={table}>
        <DataTable.Toolbar className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Heading>Workflow Executions</Heading>
            <Text className="text-ui-fg-subtle" size="small">
              Monitor workflow executions and inspect step activity.
            </Text>
          </div>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search workflows"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setQuerySearch(searchInput.trim())
                  setPagination((prev) => ({ ...prev, pageIndex: 0 }))
                }
              }}
            />
            <Button
              size="small"
              variant="secondary"
              onClick={() => {
                setQuerySearch(searchInput.trim())
                setPagination((prev) => ({ ...prev, pageIndex: 0 }))
              }}
            >
              Search
            </Button>
            <Button
              size="small"
              variant="transparent"
              onClick={() => refetch()}
              isLoading={isFetching}
            >
              <ArrowPath className="h-4 w-4" />
            </Button>
          </div>
        </DataTable.Toolbar>

        <div className="flex flex-wrap gap-2 border-b px-4 py-3">
          {STATUS_FILTERS.map((item) => (
            <Button
              key={item.label}
              size="small"
              variant={stateFilter === item.value ? "primary" : "secondary"}
              onClick={() => {
                setStateFilter(item.value)
                setPagination((prev) => ({ ...prev, pageIndex: 0 }))
              }}
            >
              {item.label}
            </Button>
          ))}
        </div>

        {error ? (
          <div className="p-6">
            <Text className="text-ui-fg-muted">
              Failed to load workflow executions. {error.message}
            </Text>
          </div>
        ) : (
          <>
            <DataTable.Table />
            <DataTable.Pagination />
          </>
        )}
      </DataTable>

    </Container>
  )
}

export const handle = {
  breadcrumb: () => "Workflows",
}

export const config: RouteConfig = {
  label: "Workflows",
}

export default WorkflowsSettingsPage
