import { useMemo, useState } from "react";
import { ArrowLeft, CreditCard, Eye } from "@medusajs/icons";
import { Badge, Button, Container, Heading, Text } from "@medusajs/ui";
import { useNavigate, useParams } from "react-router-dom";
import { useCustomerBankDetail } from "../../../hooks/api/customer-bank-detail";
import { formatDateTimestamp } from "../../../lib/date-utils";
import { MappedCustomersTable } from "../components/mapped-customers-table";

const Field = ({ label, value }: { label: string; value?: string | null }) => (
  <div>
    <Text className="text-xs text-ui-fg-subtle mb-1">{label}</Text>
    <Text className="text-sm break-all">{value ?? "–"}</Text>
  </div>
);

const CustomerBankDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    customerBankDetail,
    customerBankAccountVerification,
    isLoading,
    isError,
    error,
  } = useCustomerBankDetail(id);

  const [showAccount, setShowAccount] = useState(false);
  const [showHolder, setShowHolder] = useState(false);

  const accountDisplay = useMemo(() => {
    if (!customerBankDetail) return "–";
    return showAccount
      ? customerBankDetail.account_number ?? "–"
      : customerBankDetail.masked_account ?? "–";
  }, [showAccount, customerBankDetail]);

  const holderDisplay = useMemo(() => {
    if (!customerBankDetail) return "–";
    return showHolder
      ? customerBankDetail.account_holder_name ?? "–"
      : customerBankDetail.masked_holder ?? "–";
  }, [showHolder, customerBankDetail]);

  if (isLoading) {
    return (
      <Container>
        <div className="flex justify-center py-20">
          <Text className="text-ui-fg-subtle">Loading customer bank details...</Text>
        </div>
      </Container>
    );
  }

  if (isError || !customerBankDetail) {
    return (
      <Container>
        <Button
          variant="secondary"
          className="mb-6"
          onClick={() => navigate("/customer-bank-detail")}
        >
          <ArrowLeft /> Back
        </Button>

        <div className="p-6 border border-ui-border-error rounded-lg">
          <Text className="text-ui-fg-error">
            {error?.message ?? "Customer bank detail not found"}
          </Text>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="flex justify-between items-center mb-8">
        <div className="flex gap-4 items-center">
          <Button variant="secondary" onClick={() => navigate("/customer-bank-detail")}>
            <ArrowLeft />
          </Button>

          <div>
            <Heading level="h1">Customer Bank Detail</Heading>
            <Text className="text-ui-fg-subtle text-sm">ID: {customerBankDetail.id}</Text>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 border rounded-lg bg-ui-bg-base">
            <div className="flex items-center gap-3 mb-5">
              <CreditCard className="w-5 h-5 text-ui-fg-muted" />
              <Heading level="h2">Bank Information</Heading>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <Field label="Verified By" value={customerBankDetail.verified_by} />

              <div>
                <Text className="text-xs text-ui-fg-subtle mb-1">Account Number</Text>
                <div className="flex items-center gap-2">
                  <Text className="font-mono text-sm">{accountDisplay}</Text>
                  {customerBankDetail.account_number != null && (
                    <Button
                      size="small"
                      variant="secondary"
                      onClick={() => setShowAccount((v) => !v)}
                    >
                      <Eye />
                    </Button>
                  )}
                </div>
              </div>

              <div>
                <Text className="text-xs text-ui-fg-subtle mb-1">Account Holder Name</Text>
                <div className="flex items-center gap-2">
                  <Text className="font-mono text-sm">{holderDisplay}</Text>
                  {customerBankDetail.account_holder_name != null && (
                    <Button
                      size="small"
                      variant="secondary"
                      onClick={() => setShowHolder((v) => !v)}
                    >
                      <Eye />
                    </Button>
                  )}
                </div>
              </div>

              <Field label="IFSC Code" value={customerBankDetail.ifsc_code} />

              <div>
                <Text className="text-xs text-ui-fg-subtle mb-1">Status</Text>
                <Badge color={customerBankDetail.status === "active" ? "green" : "red"}>
                  {customerBankDetail.status ?? "–"}
                </Badge>
              </div>

              <Field
                label="Customer Bank Verification ID"
                value={customerBankDetail.customer_bank_account_verification_id}
              />
            </div>
          </div>

          {customerBankAccountVerification && (
            <div className="p-6 border rounded-lg bg-ui-bg-base">
              <Heading level="h2" className="mb-5">
                Bank Account Verification
              </Heading>

              <div className="grid md:grid-cols-2 gap-5">
                <Field label="Verification ID" value={customerBankAccountVerification.id} />
                <Field label="Gateway" value={customerBankAccountVerification.gateway_id} />

                <div>
                  <Text className="text-xs text-ui-fg-subtle mb-1">Status</Text>
                  <Badge
                    color={
                      customerBankAccountVerification.status === "completed" ? "green" : "red"
                    }
                  >
                    {customerBankAccountVerification.status}
                  </Badge>
                </div>

                <div>
                  <Text className="text-xs text-ui-fg-subtle mb-1">Bank Account Status</Text>
                  <Badge
                    color={
                      customerBankAccountVerification.bank_account_status === "active"
                        ? "green"
                        : "red"
                    }
                  >
                    {customerBankAccountVerification.bank_account_status ?? "-"}
                  </Badge>
                </div>

                <Field
                  label="Registered Name"
                  value={customerBankAccountVerification.registered_name}
                />
                <Field label="Reference ID" value={customerBankAccountVerification.reference_id} />
                <Field label="UTR" value={customerBankAccountVerification.utr} />
                <Field
                  label="Fund Account ID"
                  value={customerBankAccountVerification.fund_account_id}
                />
                <Field label="Contact ID" value={customerBankAccountVerification.contact_id} />

                {customerBankAccountVerification.failure_reason && (
                  <div className="md:col-span-2">
                    <Text className="text-xs text-ui-fg-subtle mb-1">Failure Reason</Text>
                    <Text className="text-ui-fg-error text-sm">
                      {customerBankAccountVerification.failure_reason}
                    </Text>
                  </div>
                )}

                {customerBankAccountVerification.metadata &&
                  Object.keys(customerBankAccountVerification.metadata).length > 0 && (
                    <div className="p-6 border rounded-lg bg-ui-bg-base">
                      <Heading level="h2" className="mb-4">
                        Metadata
                      </Heading>
                      <pre className="text-xs bg-ui-bg-subtle p-4 rounded max-h-52 overflow-auto">
                        {JSON.stringify(customerBankAccountVerification.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
              </div>

              <div className="border-t mt-6 pt-4 grid md:grid-cols-2 gap-4">
                <Field
                  label="Created At"
                  value={formatDateTimestamp(customerBankAccountVerification.created_at)}
                />
                <Field
                  label="Updated At"
                  value={formatDateTimestamp(customerBankAccountVerification.updated_at)}
                />
              </div>
            </div>
          )}

          {customerBankDetail.metadata && Object.keys(customerBankDetail.metadata).length > 0 && (
            <div className="p-6 border rounded-lg bg-ui-bg-base">
              <Heading level="h2" className="mb-4">
                Metadata
              </Heading>
              <pre className="text-xs bg-ui-bg-subtle p-4 rounded max-h-52 overflow-auto">
                {JSON.stringify(customerBankDetail.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div>
          <div className="p-6 border rounded-lg bg-ui-bg-base">
            <Heading level="h2" className="mb-5">
              Audit
            </Heading>
            <div className="space-y-4">
              <Field label="Created By" value={customerBankDetail.created_by} />
              <Field label="Updated By" value={customerBankDetail.updated_by} />
              <Field label="Created At" value={formatDateTimestamp(customerBankDetail.created_at)} />
              <Field label="Updated At" value={formatDateTimestamp(customerBankDetail.updated_at)} />
            </div>
          </div>
        </div>
      </div>

      {customerBankDetail?.id && (
        <div className="mt-8">
          <MappedCustomersTable bankDetailId={customerBankDetail.id} />
        </div>
      )}
    </Container>
  );
};

export default CustomerBankDetailPage;
