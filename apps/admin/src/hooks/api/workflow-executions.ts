import { useQuery } from "@tanstack/react-query"
import { queryKeysFactory } from "@mercurjs/dashboard-shared"

export const workflowExecutionsQueryKeys = queryKeysFactory("workflow_executions")

export type WorkflowExecutionState =
  | "not_started"
  | "invoking"
  | "done"
  | "failed"
  | "compensating"
  | "reverted"
  | string

export interface WorkflowExecution {
  id?: string
  workflow_id: string
  transaction_id: string
  state: WorkflowExecutionState
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
  execution?: Record<string, unknown>
  context?: Record<string, unknown>
}

interface WorkflowExecutionsListResponse {
  workflow_executions: WorkflowExecution[]
  count?: number
  limit?: number
  offset?: number
}

interface WorkflowExecutionResponse {
  workflow_execution: WorkflowExecution
}

const buildQS = (query?: Record<string, unknown>): string => {
  if (!query) return ""

  const sp = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return
    sp.set(key, String(value))
  })

  const qs = sp.toString()
  return qs ? `?${qs}` : ""
}

const apiFetch = async <T>(url: string): Promise<T> => {
  const res = await fetch(url, { credentials: "include" })

  if (!res.ok) {
    let msg = "Failed to fetch workflow executions"
    try {
      const body = await res.json()
      msg = body.message || body.error || msg
    } catch {
      msg = res.statusText || msg
    }
    throw new Error(msg)
  }

  return res.json() as Promise<T>
}

export const useWorkflowExecutions = (query?: {
  limit?: number
  offset?: number
  order?: string
}) => {
  const { data, ...other } = useQuery({
    queryKey: workflowExecutionsQueryKeys.list(query),
    queryFn: () =>
      apiFetch<WorkflowExecutionsListResponse>(
        `/admin/workflows-executions${buildQS(query)}`
      ),
  })

  return {
    workflow_executions: data?.workflow_executions ?? [],
    count: data?.count ?? 0,
    limit: data?.limit,
    offset: data?.offset,
    ...other,
  }
}

export const useWorkflowExecution = (id?: string) => {
  const { data, ...other } = useQuery({
    queryKey: workflowExecutionsQueryKeys.detail(id ?? ""),
    queryFn: () =>
      apiFetch<WorkflowExecutionResponse>(`/admin/workflows-executions/${id}`),
    enabled: !!id,
  })

  return {
    workflow_execution: data?.workflow_execution,
    ...other,
  }
}
