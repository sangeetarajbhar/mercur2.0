import { useMemo } from "react";
import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { CustomerUpiDetail } from "../types";
import { Badge, Copy, Text } from "@medusajs/ui";
import { DateCell, DateHeader } from "./date-cell";
import { useNavigate } from "react-router-dom";
import { Eye } from "@medusajs/icons";
import { ActionsButton } from "../../../common/ActionsButton";

const columnHelper = createColumnHelper<CustomerUpiDetail>();

type UseCustomerUpiDetailTableColumnsProps = {
  exclude?: string[];
};

export const useCustomerUpiDetailListTableColumns = (
  props: UseCustomerUpiDetailTableColumnsProps
) => {
  const { exclude = [] } = props ?? {};
  const navigate = useNavigate();

  const columns = useMemo(
    () => [
      columnHelper.accessor("id", {
        header: "Id",
        cell: ({ getValue }) => {
          return getValue();
        },
      }),
      columnHelper.accessor("customer_bank_account_verification_id", {
        header: "Customer Bank Account Verification Id",
        cell: ({ getValue }) => {
          const customerBankAccountVerificationId = getValue();
          return (
            <div className="flex h-full w-full items-center">
              <Text size="small" className="truncate">
                {customerBankAccountVerificationId}
                <Copy
                  content={`${customerBankAccountVerificationId}`}
                  className="text-ui-fg-muted"
                />
              </Text>
            </div>
          );
        },
      }),
      columnHelper.accessor("masked_upi", {
        header: "Masked Upi",
        cell: ({ getValue }) => {
          return getValue();
        },
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: ({ getValue }) => {
          const status = getValue();

          return (
            <Badge color={status === "active" ? "green" : "red"}>
              {status}
            </Badge>
          );
        },
      }),
      columnHelper.accessor("created_at", {
        header: () => <DateHeader />,
        cell: ({ getValue, row }) => {
          const created_at = getValue();
          const updated_at = row.original?.updated_at;

          const date =
            created_at instanceof Date ? created_at : new Date(created_at);
          const updated_at_date =
            updated_at instanceof Date ? updated_at : new Date(updated_at);

          return <DateCell date={date} updated_at_date={updated_at_date} />;
        },
      }),
      columnHelper.display({
        id: "actions",
        header: () => "Action",
        cell: ({ row }) => (
          <ActionsButton
            actions={[
              {
                label: "View record",
                onClick: () =>
                  navigate(`/customer-upi-detail/${row.original.id}`),
                icon: <Eye />,
              },
            ]}
          />
        ),
      }),
    ],
    [navigate]
  );

  const colKey = (c: unknown): string | undefined => {
    if (typeof c !== "object" || c === null) return undefined;
    const col = c as Record<string, unknown>;
    if (typeof col["accessorKey"] === "string") return col["accessorKey"];
    if (typeof col["id"] === "string") return col["id"];
    return undefined;
  };

  return (columns as unknown[])
    .filter((c) => {
      const key = colKey(c);
      return key === undefined || !exclude.includes(key);
    }) as ColumnDef<CustomerUpiDetail>[];
};
