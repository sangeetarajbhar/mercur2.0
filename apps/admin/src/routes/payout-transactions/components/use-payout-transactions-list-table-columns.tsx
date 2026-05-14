import { useMemo } from "react";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { Badge, Copy, Text } from "@medusajs/ui";
import type { PayoutTransactions } from "../types";
import { StatusCell } from "./status-cell";
import { DateCell, DateHeader } from "./date-cell";
import { getCustomPayoutTransactionsJobStatus } from "../helpers/payout-transactions-helpers";

const columnHelper = createColumnHelper<PayoutTransactions>();

type UsePayoutTransactionsTableColumnsProps = {
  exclude?: string[];
};

export const usePayoutTransactionsListTableColumns = (
  props: UsePayoutTransactionsTableColumnsProps
) => {
  const { exclude = [] } = props ?? {};

  const columns = useMemo(
    () =>
      [
        columnHelper.accessor("id", {
          header: "Id",
          cell: ({ getValue }) => getValue(),
        }),
        columnHelper.accessor("provider_payout_id", {
          header: "Payout Id",
          cell: ({ getValue }) => {
            const payoutId = getValue();
            return (
              <div className="flex h-full w-full items-center">
                <Text size="small" className="truncate">
                  {payoutId}
                  <Copy content={`${payoutId}`} className="text-ui-fg-muted" />
                </Text>
              </div>
            );
          },
        }),
        columnHelper.accessor("provider_fund_account_id", {
          header: "Fund Account Id",
          cell: ({ getValue }) => {
            const fundAccountId = getValue();
            return (
              <div className="flex h-full w-full items-center">
                <Text size="small" className="truncate">
                  {fundAccountId}
                  <Copy content={`${fundAccountId}`} className="text-ui-fg-muted" />
                </Text>
              </div>
            );
          },
        }),
        columnHelper.accessor("return_id", {
          header: "Return Id",
          cell: ({ getValue }) => {
            const returnId = getValue();
            return (
              <div className="flex h-full w-full items-center">
                <Text size="small" className="truncate">
                  {returnId}
                  <Copy content={`${returnId}`} className="text-ui-fg-muted" />
                </Text>
              </div>
            );
          },
        }),
        columnHelper.accessor("status", {
          header: "Status",
          cell: ({ getValue }) => {
            const status = getValue();
            const { label, color } = getCustomPayoutTransactionsJobStatus(status);
            return <StatusCell color={color}>{label}</StatusCell>;
          },
        }),
        columnHelper.accessor("amount", {
          header: "Amount",
          cell: ({ getValue }) => {
            const amount = getValue();
            if (amount > 0) {
              return amount / 100;
            }
            return amount;
          },
        }),
        columnHelper.accessor("fees", {
          header: "fees",
          cell: ({ getValue }) => {
            const fees = getValue();
            if (fees && fees > 0) {
              return fees / 100;
            }
            return fees;
          },
        }),
        columnHelper.accessor("tax", {
          header: "tax",
          cell: ({ getValue }) => {
            const tax = getValue();
            if (tax && tax > 0) {
              return tax / 100;
            }
            return tax;
          },
        }),
        columnHelper.accessor("payout_mode", {
          header: "Payment Mode",
          cell: ({ getValue }) => getValue(),
        }),
        columnHelper.accessor("utr", {
          header: "UTR",
          cell: ({ getValue }) => {
            const utr = getValue();
            if (!utr) return "NA";
            return (
              <div className="flex h-full w-full items-center">
                <Text size="small" className="truncate">
                  {utr}
                  <Copy content={`${utr}`} className="text-ui-fg-muted" />
                </Text>
              </div>
            );
          },
        }),
        columnHelper.accessor("notes", {
          header: "Refund Source",
          cell: ({ getValue }) => {
            const notes = getValue();
            let refundSource = "NA";

            if (!notes) return refundSource;
            try {
              const parsed = typeof notes === "string" ? JSON.parse(notes) : notes;
              refundSource = (parsed as { refund_source?: string })?.refund_source ?? "NA";
            } catch {
              refundSource = "NA";
            }

            return (
              <div className="flex h-full w-full items-center">
                <Text size="small" className="truncate">
                  {refundSource}
                </Text>
              </div>
            );
          },
        }),
        columnHelper.accessor("order_id", {
          header: "Order Id",
          cell: ({ getValue }) => {
            const orderId = getValue();
            return (
              <div className="flex h-full w-full items-center">
                <Text size="small" className="truncate">
                  {orderId}
                  <Copy content={`${orderId}`} className="text-ui-fg-muted" />
                </Text>
              </div>
            );
          },
        }),
        columnHelper.accessor("customer_id", {
          header: "Customer Id",
          cell: ({ getValue }) => {
            const customerId = getValue();
            return (
              <div className="flex h-full w-full items-center">
                <Text size="small" className="truncate">
                  {customerId}
                  <Copy content={`${customerId}`} className="text-ui-fg-muted" />
                </Text>
              </div>
            );
          },
        }),
        columnHelper.accessor("type", {
          header: "Type",
          cell: ({ getValue }) => {
            const type = getValue();
            if (!type) return "NA";
            return (
              <Badge color={type === "bank" ? "blue" : "purple"}>
                {type === "bank" ? "Bank Account" : "UPI"}
              </Badge>
            );
          },
        }),
        columnHelper.accessor("type_id", {
          header: "Type Id",
          cell: ({ getValue }) => {
            const typeId = getValue();
            if (!typeId) return "NA";
            return (
              <div className="flex h-full w-full items-center">
                <Text size="small" className="truncate">
                  {typeId}
                  <Copy content={`${typeId}`} className="text-ui-fg-muted" />
                </Text>
              </div>
            );
          },
        }),
        columnHelper.accessor("created_at", {
          header: () => <DateHeader />,
          cell: ({ getValue, row }) => {
            const created_at = getValue();
            const updated_at = row.original?.updated_at;
            const date = created_at instanceof Date ? created_at : new Date(created_at);
            const updated_at_date =
              updated_at instanceof Date ? updated_at : new Date(updated_at);
            return <DateCell date={date} updated_at_date={updated_at_date} />;
          },
        }),
      ] as ColumnDef<PayoutTransactions>[],
    []
  );

  return columns.filter((column) => {
    const key = "accessorKey" in column ? String(column.accessorKey) : column.id || "";
    return !exclude.includes(key);
  });
};
