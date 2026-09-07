import { useState, useMemo } from "react";
import {
  Container,
  Heading,
  Button,
  Text,
  Badge,
} from "@medusajs/ui";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard, Eye } from "@medusajs/icons";
import { formatDateTimestamp } from "../../../lib/date-utils";
import { useCustomerUpiDetail } from "../../../hooks/api/customer-upi-detail";
import { MappedCustomersTable } from "../components/mapped-customers-table";

const Field = ({ label, value }: { label: string; value?: string | null }) => (
  <div>
    <Text className="text-xs text-ui-fg-subtle mb-1">{label}</Text>
    <Text className="text-sm break-all">{value ?? "–"}</Text>
  </div>
);

const CustomerUpiDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    customerUpiDetail,
    customerBankAccountVerification,
    isLoading,
    isError,
    error,
  } = useCustomerUpiDetail(id);

  const [showUpi, setShowUpi] = useState(false);

  const upiDisplay = useMemo(() => {
    if (!customerUpiDetail) return "–";

    return showUpi
      ? customerUpiDetail.upi_id ?? "–"
      : customerUpiDetail.masked_upi ?? "–";
  }, [showUpi, customerUpiDetail]);

  if (isLoading) {
    return (
      <Container>
        <div className="flex justify-center py-20">
          <Text className="text-ui-fg-subtle">
            Loading customer UPI details...
          </Text>
        </div>
      </Container>
    );
  }

  if (isError || !customerUpiDetail) {
    return (
      <Container>
        <Button
          variant="secondary"
          className="mb-6"
          onClick={() => navigate("/customer-upi-detail")}
        >
          <ArrowLeft /> Back
        </Button>

        <div className="p-6 border border-ui-border-error rounded-lg">
          <Text className="text-ui-fg-error">
            {error?.message ?? "Customer UPI detail not found"}
          </Text>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div className="flex gap-4 items-center">
          <Button
            variant="secondary"
            onClick={() => navigate("/customer-upi-detail")}
          >
            <ArrowLeft />
          </Button>

          <div>
            <Heading level="h1">Customer UPI Detail</Heading>
            <Text className="text-ui-fg-subtle text-sm">
              ID: {customerUpiDetail.id}
            </Text>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* LEFT SIDE */}
        <div className="lg:col-span-2 space-y-6">
          {/* UPI SECTION */}
          <div className="p-6 border rounded-lg bg-ui-bg-base">
            <div className="flex items-center gap-3 mb-5">
              <CreditCard className="w-5 h-5 text-ui-fg-muted" />
              <Heading level="h2">UPI Information</Heading>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <Field
                label="Verified By"
                value={customerUpiDetail.verified_by}
              />

              <div>
                <Text className="text-xs text-ui-fg-subtle mb-1">UPI ID</Text>

                <div className="flex items-center gap-2">
                  <Text className="font-mono text-sm">{upiDisplay}</Text>

                  {customerUpiDetail.upi_id && (
                    <Button
                      size="small"
                      variant="secondary"
                      onClick={() => setShowUpi((v) => !v)}
                    >
                      <Eye />
                    </Button>
                  )}
                </div>
              </div>

              <div>
                <Text className="text-xs text-ui-fg-subtle mb-1">Status</Text>
                <Badge
                  color={
                    customerUpiDetail.status === "active" ? "green" : "red"
                  }
                >
                  {customerUpiDetail.status ?? "–"}
                </Badge>
              </div>

              <Field
                label="Customer Bank Verification ID"
                value={
                  customerUpiDetail.customer_bank_account_verification_id
                }
              />
            </div>
          </div>

          {/* BANK VERIFICATION */}
          {customerBankAccountVerification && (
            <div className="p-6 border rounded-lg bg-ui-bg-base">
              <Heading level="h2" className="mb-5">
                Bank Account Verification
              </Heading>

              <div className="grid md:grid-cols-2 gap-5">
                <Field
                  label="Verification ID"
                  value={customerBankAccountVerification.id}
                />

                <Field
                  label="Gateway"
                  value={customerBankAccountVerification.gateway_id}
                />

                <div>
                  <Text className="text-xs text-ui-fg-subtle mb-1">
                    Status
                  </Text>

                  <Badge
                    color={
                      customerBankAccountVerification.status === "completed"
                        ? "green"
                        : "red"
                    }
                  >
                    {customerBankAccountVerification.status}
                  </Badge>
                </div>

                <div>
                  <Text className="text-xs text-ui-fg-subtle mb-1">
                    Bank Account Status
                  </Text>

                  <Badge
                    color={
                      customerBankAccountVerification.bank_account_status ===
                      "active"
                        ? "green"
                        : "red"
                    }
                  >
                    {customerBankAccountVerification.bank_account_status ??
                      "-"}
                  </Badge>
                </div>

                <Field
                  label="Registered Name"
                  value={customerBankAccountVerification.registered_name}
                />

                <Field
                  label="Reference ID"
                  value={customerBankAccountVerification.reference_id}
                />

                <Field
                  label="UTR"
                  value={customerBankAccountVerification.utr}
                />

                <Field
                  label="Fund Account ID"
                  value={customerBankAccountVerification.fund_account_id}
                />

                <Field
                  label="Contact ID"
                  value={customerBankAccountVerification.contact_id}
                />

                {customerBankAccountVerification.failure_reason && (
                  <div className="md:col-span-2">
                    <Text className="text-xs text-ui-fg-subtle mb-1">
                      Failure Reason
                    </Text>

                    <Text className="text-ui-fg-error text-sm">
                      {customerBankAccountVerification.failure_reason}
                    </Text>
                  </div>
                )}

                {customerBankAccountVerification.metadata &&
                  Object.keys(customerBankAccountVerification.metadata)
                    .length > 0 && (
                    <div className="p-6 border rounded-lg bg-ui-bg-base">
                      <Heading level="h2" className="mb-4">
                        Metadata
                      </Heading>

                      <pre className="text-xs bg-ui-bg-subtle p-4 rounded max-h-52 overflow-auto">
                        {JSON.stringify(
                          customerBankAccountVerification.metadata,
                          null,
                          2
                        )}
                      </pre>
                    </div>
                  )}
              </div>

              <div className="border-t mt-6 pt-4 grid md:grid-cols-2 gap-4">
                <Field
                  label="Created At"
                  value={formatDateTimestamp(
                    customerBankAccountVerification.created_at
                  )}
                />

                <Field
                  label="Updated At"
                  value={formatDateTimestamp(
                    customerBankAccountVerification.updated_at
                  )}
                />
              </div>
            </div>
          )}

          {/* METADATA */}
          {customerUpiDetail.metadata &&
            Object.keys(customerUpiDetail.metadata).length > 0 && (
              <div className="p-6 border rounded-lg bg-ui-bg-base">
                <Heading level="h2" className="mb-4">
                  Metadata
                </Heading>

                <pre className="text-xs bg-ui-bg-subtle p-4 rounded max-h-52 overflow-auto">
                  {JSON.stringify(customerUpiDetail.metadata, null, 2)}
                </pre>
              </div>
            )}
        </div>

        {/* RIGHT SIDEBAR */}
        <div>
          <div className="p-6 border rounded-lg bg-ui-bg-base">
            <Heading level="h2" className="mb-5">
              Audit
            </Heading>

            <div className="space-y-4">
              <Field
                label="Created By"
                value={customerUpiDetail.created_by}
              />

              <Field
                label="Updated By"
                value={customerUpiDetail.updated_by}
              />

              <Field
                label="Created At"
                value={formatDateTimestamp(customerUpiDetail.created_at)}
              />

              <Field
                label="Updated At"
                value={formatDateTimestamp(customerUpiDetail.updated_at)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mapped customers (customer_payment_preferences where type_id = this UPI) */}
      {customerUpiDetail?.id && (
        <div className="mt-8">
          <MappedCustomersTable upiDetailId={customerUpiDetail.id} />
        </div>
      )}
    </Container>
  );
};

export default CustomerUpiDetailPage;
