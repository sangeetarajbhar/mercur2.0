import { Container, Heading, Text, Badge, toast } from "@medusajs/ui"
import { CreditCard, Eye } from "@medusajs/icons"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { createColumnHelper } from "@tanstack/react-table"
import {
  _DataTable,
  type Filter,
  SingleColumnPage,
  useDataTable,
  useQueryParams,
} from "@mercurjs/dashboard-shared"
import { useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { ActionsButton } from "../../common/ActionsButton"
import type { RefundMethod } from "./types"

const PAGE_SIZE = 10
const columnHelper = createColumnHelper<RefundMethod>()

const useRefundMethodsTableQuery = () => {
  const queryObject = useQueryParams([
    "offset",
    "q",
    "type",
    "is_default",
    "created_at",
    "order",
  ])
  const { offset, q, type, is_default, created_at, order } = queryObject

  return {
    raw: queryObject,
    searchParams: {
      limit: PAGE_SIZE,
      offset: offset ? Number(offset) : 0,
      q,
      type,
      is_default,
      created_at: created_at ? JSON.parse(created_at) : undefined,
      order,
    },
  }
}

const useRefundMethodsFilters = (): Filter[] => [
  {
    key: "type",
    label: "Type",
    type: "select",
    options: [
      { label: "Bank Account", value: "bank" },
      { label: "UPI", value: "upi" },
    ],
  },
  {
    key: "is_default",
    label: "Default Status",
    type: "select",
    options: [
      { label: "Default", value: "true" },
      { label: "Non-default", value: "false" },
    ],
  },
  { key: "created_at", label: "Created At", type: "date" },
]

const useRefundMethods = (searchParams: Record<string, unknown>) => {
  const qs = new URLSearchParams()
  Object.entries(searchParams).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return
    if (typeof value === "object") {
      qs.set(key, JSON.stringify(value))
      return
    }
    qs.set(key, String(value))
  })

  return useQuery({
    queryKey: ["admin_refund_methods", searchParams],
    queryFn: async () => {
      const response = await fetch(`/admin/refund-methods?${qs.toString()}`, {
        credentials: "include",
      })
      if (!response.ok) throw new Error("Failed to fetch refund methods")
      return response.json() as Promise<{
        refund_methods: RefundMethod[]
        count: number
      }>
    },
    placeholderData: keepPreviousData,
  })
}

const Page = () => {
  const navigate = useNavigate()
  const { raw, searchParams } = useRefundMethodsTableQuery()
  const { data, isError, error, isFetching } = useRefundMethods(searchParams)
  const filters = useRefundMethodsFilters()

  const columns = useMemo(
    () => [
      columnHelper.accessor("customer_id", {
        header: "Customer ID",
        cell: ({ getValue }) => (
          <Text size="small" className="font-mono min-w-[230px]">
            {getValue()}
          </Text>
        ),
      }),
      columnHelper.accessor("type", {
        header: "Type",
        cell: ({ getValue }) => {
          const type = getValue()
          return (
            <Badge color={type === "bank" ? "blue" : "purple"}>
              {type === "bank" ? "Bank Account" : "UPI"}
            </Badge>
          )
        },
      }),
      columnHelper.display({
        id: "account",
        header: "Account Info",
        cell: ({ row }) => {
          const method = row.original
          if (method.type === "bank") {
            return (
              <div className="font-mono text-sm min-w-[170px]">
                <div>{method.masked_account || "NA"}</div>
                <div className="text-xs text-ui-fg-subtle">
                  {method.ifsc_code || "NA"}
                </div>
              </div>
            )
          }
          return (
            <Text size="small" className="font-mono min-w-[170px]">
              {method.masked_upi || "NA"}
            </Text>
          )
        },
      }),
      columnHelper.accessor("masked_holder", {
        header: "Account Holder",
        cell: ({ getValue }) => <Text size="small" className="min-w-[100px]">{getValue() || "N/A"}</Text>,
      }),
      columnHelper.accessor("is_default", {
        header: "Default",
        cell: ({ getValue }) => {
          const isDefault = Boolean(getValue())
          return (
            <Badge color={isDefault ? "blue" : "grey"}>
              {isDefault ? "Default" : "Non-default"}
            </Badge>
          )
        },
      }),
      columnHelper.accessor("is_account_verified", {
        header: "Account verify status",
        cell: ({ getValue }) => {
          const isVerified = Boolean(getValue())
          return (
            <Badge color={isVerified ? "green" : "orange"}>
              {isVerified ? "Verified" : "Not verified"}
            </Badge>
          )
        },
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: ({ getValue }) => {
          const isActive = Boolean(getValue())
          return (
            <Badge color={isActive ? "green" : "red"}>
              {isActive ? "Active" : "Not Active"}
            </Badge>
          )
        },
      }),
      columnHelper.accessor("bank_account_verification", {
        header: "Razorpay Status",
        cell: ({ getValue }) => {
          const verification = getValue()
          return <Text size="small" className="min-w-[90px]">{verification?.status || "NA"}</Text>
        },
      }),
      columnHelper.accessor("created_at", {
        header: "Created At",
        cell: ({ getValue }) => (
          <Text size="small" className="min-w-[90px]">
            {new Date(getValue()).toLocaleDateString("en-IN")}
          </Text>
        ),
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <ActionsButton
            actions={[
              {
                label: "View Details",
                icon: <Eye />,
                onClick: () => navigate(`/customer_refund_methods/${row.original.id}`),
              },
              {
                label: "View Decrypted",
                icon: <Eye />,
                onClick: async () => {
                  try {
                    const r = await fetch(
                      `/admin/refund-methods/${row.original.id}/decrypt`,
                      { credentials: "include" }
                    )
                    if (!r.ok) throw new Error("Failed to decrypt")
                    const d = await r.json()
                    const m = d.refund_method
                    const details =
                      m.type === "bank"
                        ? `Type: BANK\nAccount: ${m.account_number || "NA"}\nIFSC: ${m.ifsc_code || "NA"}\nHolder: ${m.account_holder_name || "NA"}`
                        : `Type: UPI\nUPI ID: ${m.upi_id || "NA"}`
                    window.alert(details)
                  } catch (e) {
                    toast.error(
                      e instanceof Error ? e.message : "Failed to decrypt"
                    )
                  }
                },
              },
            ]}
          />
        ),
      }),
    ],
    [navigate]
  )

  const { table } = useDataTable({
    data: data?.refund_methods || [],
    columns,
    count: data?.count || 0,
    enablePagination: true,
    pageSize: PAGE_SIZE,
    getRowId: (row) => row.id,
  })

  if (isError) throw error

  return (
    <SingleColumnPage>
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading>Customer Refund Methods</Heading>
        </div>
        <div className="refund-methods-table overflow-x-auto">
          <_DataTable
            columns={columns}
            table={table}
            pagination
            filters={filters}
            count={data?.count || 0}
            search
            isLoading={isFetching}
            pageSize={PAGE_SIZE}
            queryObject={raw}
            noRecords={{ message: "No refund methods found" }}
            orderBy={[
              { key: "created_at", label: "Created At" },
              { key: "customer_id", label: "Customer ID" },
              { key: "type", label: "Type" },
              { key: "is_default", label: "Default Status" },
            ]}
          />
        </div>
      </Container>
      <style>{`
        .refund-methods-table {
          position: relative;
          isolation: isolate;
        }

        
        .refund-methods-table table tbody tr td {
          border-bottom: 1px solid var(--ui-border-base);
        }

        .refund-methods-table table th:first-child,
        .refund-methods-table table td:first-child {
          position: sticky;
          left: 0;
          z-index: 3;
          box-shadow: 1px 0 0 var(--ui-border-base);
          background-clip: padding-box;
        }

        .refund-methods-table table th:first-child {
          z-index: 4;
        }
      `}</style>
    </SingleColumnPage>
  )
}

export const config: RouteConfig = {
  label: "Customer Refund Methods",
  icon: CreditCard,
}

export default Page








