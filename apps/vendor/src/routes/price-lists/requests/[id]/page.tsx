import { useParams, useNavigate } from "react-router-dom"
import {
  Badge,
  Button,
  Container,
  Heading,
  StatusBadge,
  Text,
} from "@medusajs/ui"
import { ArrowLeft } from "@medusajs/icons"

import { usePriceListRequest } from "../../../../hooks/api/price-list-requests"

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

const SectionRow = ({
  title,
  value,
}: {
  title: string
  value?: string | null
}) => (
  <div className="text-ui-fg-subtle grid grid-cols-2 items-center gap-4 px-6 py-4">
    <Text size="small" weight="plus" leading="compact">
      {title}
    </Text>
    <Text size="small" leading="compact" className="break-all">
      {value ?? "-"}
    </Text>
  </div>
)

const PriceListRequestDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data, isLoading, isError } = usePriceListRequest(id!)
  const request = data?.price_list_request

  if (isLoading) {
    return (
      <Container>
        <div className="animate-pulse space-y-4 p-6">
          <div className="h-6 w-48 rounded bg-gray-200" />
          <div className="h-4 w-full rounded bg-gray-100" />
          <div className="h-4 w-3/4 rounded bg-gray-100" />
        </div>
      </Container>
    )
  }

  if (isError || !request) {
    return (
      <Container>
        <div className="flex flex-col items-center justify-center py-16">
          <Text className="text-ui-fg-muted">Request not found.</Text>
          <Button
            variant="secondary"
            size="small"
            className="mt-4"
            onClick={() => navigate("/price-lists/requests")}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Requests
          </Button>
        </div>
      </Container>
    )
  }

  const priceData = request.data as any
  const prices: any[] = Array.isArray(priceData?.prices) ? priceData.prices : []

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <Button
          variant="transparent"
          size="small"
          onClick={() => navigate("/price-lists/requests")}
          className="text-ui-fg-muted hover:text-ui-fg-base"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Requests
        </Button>
      </div>

      {/* Main info */}
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <Heading>{request.file_name}</Heading>
            <Text size="small" className="text-ui-fg-muted font-mono">
              {request.id}
            </Text>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge color={statusColor(request.status)}>
              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
            </StatusBadge>
            <Badge size="2xsmall" color="grey">
              price_list
            </Badge>
          </div>
        </div>

        <SectionRow title="Transaction ID" value={request.transaction_id} />
        <SectionRow
          title="Submitted At"
          value={new Date(request.created_at).toLocaleString("en-IN")}
        />
        {request.reviewer_note && (
          <SectionRow title="Reviewer Note" value={request.reviewer_note} />
        )}
      </Container>

      {/* Price list meta */}
      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading level="h2">Price List Details</Heading>
        </div>
        <SectionRow title="Title" value={priceData?.title ?? "-"} />
        {priceData?.description && (
          <SectionRow title="Description" value={priceData.description} />
        )}
        {priceData?.type && (
          <SectionRow title="Type" value={priceData.type} />
        )}
        {priceData?.starts_at && (
          <SectionRow
            title="Starts At"
            value={new Date(priceData.starts_at).toLocaleString("en-IN")}
          />
        )}
        {priceData?.ends_at && (
          <SectionRow
            title="Ends At"
            value={new Date(priceData.ends_at).toLocaleString("en-IN")}
          />
        )}

        <div className="px-6 py-4">
          <Text size="small" weight="plus" className="mb-2 block">
            Prices ({prices.length})
          </Text>
          {prices.length === 0 ? (
            <Text size="small" className="text-ui-fg-muted">
              No prices found.
            </Text>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-ui-bg-subtle">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">SKU</th>
                    <th className="px-4 py-2 text-left font-medium">Amount</th>
                    <th className="px-4 py-2 text-left font-medium">Discount %</th>
                    <th className="px-4 py-2 text-left font-medium">Variant ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {prices.slice(0, 100).map((price: any, idx: number) => (
                    <tr key={idx} className="hover:bg-ui-bg-subtle">
                      <td className="px-4 py-2 font-mono text-xs">
                        {price.sku ?? "-"}
                      </td>
                      <td className="px-4 py-2">
                        {price.amount != null ? `₹${price.amount}` : "-"}
                      </td>
                      <td className="px-4 py-2">
                        {price.percentage_discount != null
                          ? `${price.percentage_discount}%`
                          : "-"}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs text-ui-fg-muted">
                        {price.variant_id ?? "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {prices.length > 100 && (
                <div className="bg-ui-bg-subtle px-4 py-2 text-center">
                  <Text size="small" className="text-ui-fg-muted">
                    Showing first 100 of {prices.length} prices
                  </Text>
                </div>
              )}
            </div>
          )}
        </div>
      </Container>
    </div>
  )
}

export const handle = {
  breadcrumb: () => "Request Detail",
}

export default PriceListRequestDetailPage
