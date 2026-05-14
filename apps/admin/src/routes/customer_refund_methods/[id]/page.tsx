import { Badge, Button, Container, Heading, Text, toast } from "@medusajs/ui"
import { ArrowLeft, CreditCard, ExclamationCircle, Eye } from "@medusajs/icons"
import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import type { RefundMethod } from "../types"

type RefundMethodType = RefundMethod["type"]

const Page = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [refundMethod, setRefundMethod] = useState<RefundMethod | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRefundMethod = async () => {
    if (!id) return

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/admin/refund-methods/${id}`, {
        credentials: "include",
      })

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Refund method not found")
        }
        throw new Error(`Failed to fetch refund method: ${response.statusText}`)
      }

      const data = (await response.json()) as { refund_method?: RefundMethod }

      if (!data.refund_method) {
        throw new Error("Refund method not found")
      }

      setRefundMethod(data.refund_method)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch refund method")
      toast.error("Failed to fetch refund method")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void fetchRefundMethod()
  }, [id])

  const handleViewDecrypted = async () => {
    if (!refundMethod) return

    try {
      const response = await fetch(`/admin/refund-methods/${refundMethod.id}/decrypt`, {
        method: "GET",
        credentials: "include",
      })

      if (!response.ok) {
        throw new Error("Failed to decrypt refund method")
      }

      const data = await response.json()
      const decryptedInfo = data.refund_method
      let message = "Decrypted Refund Method Details:\n\n"
      message += `Type: ${decryptedInfo.type}\n`

      if (decryptedInfo.type === "bank") {
        message += `Account Number: ${decryptedInfo.account_number || "N/A"}\n`
        message += `Account Holder: ${decryptedInfo.account_holder_name || "N/A"}\n`
        message += `IFSC Code: ${decryptedInfo.ifsc_code || "N/A"}\n`
      } else if (decryptedInfo.type === "upi") {
        message += `UPI ID: ${decryptedInfo.upi_id || "N/A"}\n`
      }

      window.alert(message)
    } catch {
      toast.error("Failed to decrypt refund method")
    }
  }

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })

  const getTypeColor = (type: RefundMethodType) => {
    switch (type) {
      case "bank":
        return "blue" as const
      case "upi":
        return "green" as const
      default:
        return "grey" as const
    }
  }

  const getMaskedDisplay = () => {
    if (!refundMethod) return "N/A"

    if (refundMethod.type === "bank") {
      return refundMethod.masked_account || "N/A"
    }

    if (refundMethod.type === "upi") {
      return refundMethod.masked_upi || "N/A"
    }

    return "N/A"
  }

  if (isLoading) {
    return (
      <Container>
        <div className="flex items-center justify-center py-12">
          <Text>Loading refund method...</Text>
        </div>
      </Container>
    )
  }

  if (error || !refundMethod) {
    return (
      <Container>
        <div className="mb-6 flex items-center gap-4">
          <Button variant="secondary" onClick={() => navigate("/customer_refund_methods")}>
            <ArrowLeft />
            Back to Refund Methods
          </Button>
        </div>

        <div className="bg-ui-bg-base border-ui-border-error rounded-lg border p-6">
          <div className="text-ui-fg-error mb-2 flex items-center gap-2">
            <ExclamationCircle />
            <Text className="font-medium">Error</Text>
          </div>
          <Text>{error || "Refund method not found"}</Text>
        </div>
      </Container>
    )
  }

  return (
    <Container>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="secondary" onClick={() => navigate("/customer_refund_methods")}>
            <ArrowLeft />
            Back to Refund Methods
          </Button>
          <div>
            <Heading level="h1">Refund Method Details</Heading>
            <Text className="text-ui-fg-subtle mt-1">ID: {refundMethod.id}</Text>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handleViewDecrypted}>
            <Eye />
            View Decrypted
          </Button>
        </div>
      </div>

      <div className="grid gap-6 grid-cols-3">
          <div className="col-span-2 bg-ui-bg-base border-ui-border-base rounded-lg border p-4" style={{ gridColumn: 'span 2 / span 2' }}>
            <div className="mb-4 flex items-center gap-4">
              <CreditCard className="h-6 w-6" />
              <div>
                <Text className="text-lg font-medium">
                  {refundMethod.type === "bank" ? "Bank Account" : "UPI Payment"}
                </Text>
                <div className="mt-1 flex items-center gap-2">
                  <Badge color={getTypeColor(refundMethod.type)}>{refundMethod.type.toUpperCase()}</Badge>
                  {refundMethod.is_default ? <Badge color="green">Default Method</Badge> : null}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Text className="text-ui-fg-subtle mb-1 text-xs">
                  {refundMethod.type === "bank" ? "Account Number" : "UPI ID"}
                </Text>
                <Text className="font-mono text-sm">{getMaskedDisplay()}</Text>
              </div>

              {refundMethod.masked_holder ? (
                <div>
                  <Text className="text-ui-fg-subtle mb-1 text-xs">Account Holder</Text>
                  <Text className="text-sm">{refundMethod.masked_holder}</Text>
                </div>
              ) : null}

              {refundMethod.ifsc_code ? (
                <div>
                  <Text className="text-ui-fg-subtle mb-1 text-xs">IFSC Code</Text>
                  <Text className="font-mono text-sm">{refundMethod.ifsc_code}</Text>
                </div>
              ) : null}

              <div>
                <Text className="text-ui-fg-subtle mb-1 text-xs">Account Verified</Text>
                <Text className="font-mono text-sm">
                  {refundMethod.is_account_verified ? "Verified" : "Not Verified"}
                </Text>
              </div>

              <div>
                <Text className="text-ui-fg-subtle mb-1 text-xs">Status</Text>
                <Text className="font-mono text-sm">{refundMethod.status ? "Active" : "Not Active"}</Text>
              </div>
            </div>
          </div>
          
          <div className="col-span-1 p-4 border rounded-lg border-ui-border-base bg-ui-bg-base h-full" style={{ gridColumn: 'span 1 / span 1' }}>
            <div className="h-full">
              <Text className="mb-4 text-lg font-medium">Timestamps</Text>

              <div className="space-y-3">
                <div>
                  <Text className="text-ui-fg-subtle mb-1 text-xs">Created At</Text>
                  <Text className="text-sm">{formatDate(refundMethod.created_at)}</Text>
                </div>

                <div>
                  <Text className="text-ui-fg-subtle mb-1 text-xs">Updated At</Text>
                  <Text className="text-sm">{formatDate(refundMethod.updated_at)}</Text>
                </div>
              </div>
            </div>

            {refundMethod.bank_account_verification ? (
              <div className="bg-ui-bg-base border-ui-border-base rounded-lg border p-6">
                <Text className="mb-4 text-lg font-medium">Customer Bank Account Verification Details</Text>

                <div className="space-y-3">
                  <div>
                    <Text className="text-ui-fg-subtle mb-1 text-xs">Fund Account Validation Id</Text>
                    <Text className="text-sm">{refundMethod.bank_account_verification.fav_id ?? "NA"}</Text>
                  </div>
                  <div>
                    <Text className="text-ui-fg-subtle mb-1 text-xs">Fund Account Id</Text>
                    <Text className="text-sm">{refundMethod.bank_account_verification.fund_account_id ?? "NA"}</Text>
                  </div>
                  <div>
                    <Text className="text-ui-fg-subtle mb-1 text-xs">Contact Id</Text>
                    <Text className="text-sm">{refundMethod.bank_account_verification.contact_id ?? "NA"}</Text>
                  </div>
                  <div>
                    <Text className="text-ui-fg-subtle mb-1 text-xs">Registered Name</Text>
                    <Text className="text-sm">{refundMethod.bank_account_verification.registered_name ?? "NA"}</Text>
                  </div>
                  <div>
                    <Text className="text-ui-fg-subtle mb-1 text-xs">Status</Text>
                    <Text className="text-sm">{refundMethod.bank_account_verification.status ?? "NA"}</Text>
                  </div>
                  <div>
                    <Text className="text-ui-fg-subtle mb-1 text-xs">Bank Account Status</Text>
                    <Text className="text-sm">{refundMethod.bank_account_verification.bank_account_status ?? "NA"}</Text>
                  </div>
                  <div>
                    <Text className="text-ui-fg-subtle mb-1 text-xs">UTR</Text>
                    <Text className="text-sm">{refundMethod.bank_account_verification.utr ?? "NA"}</Text>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="col-span-2 bg-ui-bg-base border-ui-border-base rounded-lg border p-4" style={{ gridColumn: 'span 2 / span 2' }}>
            <Text className="mb-4 text-lg font-medium">Customer Information</Text>
            <div>
              <Text className="text-ui-fg-subtle mb-1 text-xs">Customer ID</Text>
              <Text className="font-mono text-sm">{refundMethod.customer_id}</Text>
            </div>
          </div>

          {refundMethod.order_id || refundMethod.return_id ? (
            <div className="col-span-2 bg-ui-bg-base border-ui-border-base rounded-lg border p-4" style={{ gridColumn: 'span 2 / span 2' }}>
              <Text className="mb-4 text-lg font-medium">Associated Transactions</Text>

              <div className="space-y-3">
                {refundMethod.order_id ? (
                  <div>
                    <Text className="text-ui-fg-subtle mb-1 text-xs">Order ID</Text>
                    <Text className="font-mono text-sm">{refundMethod.order_id}</Text>
                  </div>
                ) : null}

                {refundMethod.return_id ? (
                  <div>
                    <Text className="text-ui-fg-subtle mb-1 text-xs">Return ID</Text>
                    <Text className="font-mono text-sm">{refundMethod.return_id}</Text>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
      </div>
    </Container>
  )
}

export default Page
