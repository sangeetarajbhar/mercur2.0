import { Container, Drawer, Heading, Input, Label, toast, usePrompt } from "@medusajs/ui"
import { ShoppingBag, PencilSquare, User } from "@medusajs/icons"
import type { RouteConfig } from "@mercurjs/dashboard-sdk"
import {
  _DataTable,
  SingleColumnPage,
  useDataTable,
  useQueryParams,
} from "@mercurjs/dashboard-shared"
import { useMemo, useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createColumnHelper } from "@tanstack/react-table"
import { ActionsButton } from "../../common/ActionsButton"
import type { Seller } from "./types"

const PAGE_SIZE = 10
const columnHelper = createColumnHelper<Seller>()

const buildQueryString = (params?: Record<string, unknown>) => {
  if (!params) return ""
  const sp = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return
    sp.set(k, String(v))
  })
  const qs = sp.toString()
  return qs ? `?${qs}` : ""
}

const useSellersTableQuery = () => {
  const queryObject = useQueryParams(["offset", "q", "order"])
  const { offset, q, order } = queryObject
  return {
    raw: queryObject,
    searchParams: {
      limit: PAGE_SIZE,
      offset: offset ? Number(offset) : 0,
      q,
      order: order ?? "-created_at",
    },
  }
}

const useSellers = (searchParams: Record<string, unknown>) => {
  return useQuery({
    queryKey: ["admin-sellers", searchParams],
    queryFn: async () => {
      const res = await fetch(`/admin/sellers${buildQueryString(searchParams)}`, {
        credentials: "include",
      })
      if (!res.ok) throw new Error("Failed to fetch sellers")
      return res.json() as Promise<{
        sellers: Seller[]
        count: number
        offset: number
        limit: number
      }>
    },
    placeholderData: keepPreviousData,
  })
}

const useInviteSeller = () => {
  return useMutation({
    mutationFn: async (data: { email: string; registration_url?: string }) => {
      const res = await fetch("/admin/sellers/invite", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error("Failed to invite seller")
      return res.json()
    },
  })
}

const useUpdateSeller = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (args: { id: string; data: Record<string, unknown> }) => {
      const res = await fetch(`/admin/sellers/${args.id}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(args.data),
      })
      if (!res.ok) throw new Error("Failed to update seller")
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-sellers"] }),
  })
}

const validateEmail = (email: string) => {
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  if (!ok) toast.error("Enter a valid email")
  return ok
}

const SellersListPage = () => {
  const navigate = useNavigate()
  const dialog = usePrompt()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")

  const { raw, searchParams } = useSellersTableQuery()
  const { data, isError, error, isFetching } = useSellers(searchParams)
  const { mutateAsync: inviteSeller } = useInviteSeller()
  const { mutateAsync: updateSeller } = useUpdateSeller()

  const columns = useMemo(() => {
    return [
      columnHelper.accessor("email", {
        header: "Email",
        cell: ({ getValue }) => getValue() ?? "—",
      }),
      columnHelper.accessor("name", {
        header: "Name",
        cell: ({ getValue }) => getValue(),
      }),
      columnHelper.accessor("store_status", {
        header: "Store Status",
        cell: ({ getValue }) => getValue() ?? "—",
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const seller = row.original
          const inactiveOrSuspended =
            seller.store_status === "INACTIVE" || seller.store_status === "SUSPENDED"
          return (
            <ActionsButton
              actions={[
                {
                  label: "View",
                  onClick: () => navigate(`/sellers/${seller.id}`),
                  icon: <ShoppingBag />,
                },
                {
                  label: "Edit",
                  onClick: () => navigate(`/sellers/${seller.id}/edit`),
                  icon: <PencilSquare />,
                },
                {
                  label: inactiveOrSuspended ? "Activate account" : "Suspend account",
                  onClick: async () => {
                    const ok = await dialog({
                      title: inactiveOrSuspended ? "Activate account" : "Suspend account",
                      description: inactiveOrSuspended
                        ? "Are you sure you want to activate this account?"
                        : "Are you sure you want to suspend this account?",
                      verificationText: seller.email || seller.name || "",
                    })
                    if (!ok) return
                    await updateSeller({
                      id: seller.id,
                      data: { store_status: inactiveOrSuspended ? "ACTIVE" : "SUSPENDED" },
                    })
                    toast.success("Updated")
                  },
                  icon: <User />,
                },
              ]}
            />
          )
        },
      }),
    ]
  }, [dialog, navigate, updateSeller])

  const { table } = useDataTable({
    data: data?.sellers ?? [],
    columns,
    enablePagination: true,
    count: data?.count ?? 0,
    pageSize: PAGE_SIZE,
    getRowId: (row) => row.id,
  })

  if (isError) throw error

  const handleInvite = async () => {
    if (!validateEmail(email)) return
    await inviteSeller({ email })
    toast.success("Invited!")
    setOpen(false)
    setEmail("")
  }

  return (
    <SingleColumnPage>
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading>Sellers</Heading>
          <div className="flex gap-2">
            <Link
              to="/sellers/create"
              className="text-sm font-medium px-3 py-2 rounded-md bg-ui-bg-interactive text-ui-fg-on-color"
            >
              Create Seller
            </Link>
            <Drawer open={open} onOpenChange={setOpen}>
              <Drawer.Trigger asChild>
                <button
                  className="text-sm font-medium px-3 py-2 rounded-md border border-ui-border-base hover:bg-ui-bg-base-hover"
                  onClick={() => setOpen(true)}
                >
                  Invite
                </button>
              </Drawer.Trigger>
              <Drawer.Content>
                <Drawer.Header />
                <Drawer.Body>
                  <Heading>Invite Seller</Heading>
                  <div className="flex flex-col gap-2 mt-6">
                    <Label>Email</Label>
                    <Input
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      className="mt-6 text-sm font-medium px-3 py-2 rounded-md bg-ui-bg-interactive text-ui-fg-on-color"
                      onClick={handleInvite}
                    >
                      Invite
                    </button>
                  </div>
                </Drawer.Body>
              </Drawer.Content>
            </Drawer>
          </div>
        </div>

        <_DataTable
          columns={columns}
          table={table}
          pagination
          search
          count={data?.count ?? 0}
          isLoading={isFetching}
          pageSize={PAGE_SIZE}
          orderBy={[
            { key: "email", label: "Email" },
            { key: "name", label: "Name" },
            { key: "created_at", label: "Created" },
          ]}
          queryObject={raw}
          noRecords={{ message: "No sellers found" }}
        />
      </Container>
    </SingleColumnPage>
  )
}

export const config: RouteConfig = {
  label: "Sellers",
  icon: ShoppingBag,
}

export default SellersListPage

