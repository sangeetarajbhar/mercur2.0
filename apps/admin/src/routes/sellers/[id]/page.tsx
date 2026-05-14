import { ArrowLeft, PencilSquare } from "@medusajs/icons"
import { Badge, Button, Container, Heading, Text } from "@medusajs/ui"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useNavigate, useParams } from "react-router-dom"
import type { Seller } from "../types"

export default function SellerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data, isFetching, isError, error } = useQuery({
    queryKey: ["admin-seller", id],
    queryFn: async () => {
      if (!id) throw new Error("Missing seller id")
      const res = await fetch(`/admin/sellers/${id}`, { credentials: "include" })
      if (!res.ok) throw new Error("Failed to fetch seller")
      return res.json() as Promise<{ seller: Seller }>
    },
    placeholderData: keepPreviousData,
    enabled: !!id,
  })

  const seller = data?.seller

  if (isError) {
    return (
      <Container>
        <div className="p-6 border border-ui-border-error rounded-lg">
          <Text className="text-ui-fg-error">{(error as any)?.message ?? "Failed to load"}</Text>
        </div>
      </Container>
    )
  }

  return (
    <Container>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => navigate("/sellers")}>
            <ArrowLeft />
          </Button>
          <div>
            <Heading level="h1">{seller?.name ?? "Seller"}</Heading>
            <Text className="text-ui-fg-subtle text-sm">ID: {id}</Text>
          </div>
        </div>
        <Button variant="secondary" onClick={() => navigate(`/sellers/${id}/edit`)}>
          <PencilSquare /> Edit
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="p-6 border rounded-lg bg-ui-bg-base">
          <Heading level="h2" className="mb-4">
            Overview
          </Heading>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Text className="text-xs text-ui-fg-subtle mb-1">Email</Text>
              <Text className="text-sm break-all">{seller?.email ?? "—"}</Text>
            </div>
            <div>
              <Text className="text-xs text-ui-fg-subtle mb-1">Phone</Text>
              <Text className="text-sm break-all">{seller?.phone ?? "—"}</Text>
            </div>
            <div>
              <Text className="text-xs text-ui-fg-subtle mb-1">Handle</Text>
              <Text className="text-sm break-all">{seller?.handle ?? "—"}</Text>
            </div>
            <div>
              <Text className="text-xs text-ui-fg-subtle mb-1">Store Status</Text>
              <Badge color={seller?.store_status === "ACTIVE" ? "green" : "red"}>
                {seller?.store_status ?? "—"}
              </Badge>
            </div>
          </div>
          <div className="mt-4">
            <Text className="text-xs text-ui-fg-subtle mb-1">Description</Text>
            <Text className="text-sm">{seller?.description ?? "—"}</Text>
          </div>
        </div>

        <div className="p-6 border rounded-lg bg-ui-bg-base">
          <Heading level="h2" className="mb-4">
            Members
          </Heading>
          {seller?.members?.length ? (
            <div className="space-y-3">
              {seller.members.map((m) => (
                <div key={m.id} className="flex justify-between gap-4">
                  <div>
                    <Text className="text-sm">{m.name ?? "—"}</Text>
                    <Text className="text-xs text-ui-fg-subtle">{m.email ?? "—"}</Text>
                  </div>
                  <Text className="text-xs font-mono">{m.id}</Text>
                </div>
              ))}
            </div>
          ) : (
            <Text className="text-ui-fg-subtle text-sm">{isFetching ? "Loading…" : "No members"}</Text>
          )}
        </div>
      </div>
    </Container>
  )
}

