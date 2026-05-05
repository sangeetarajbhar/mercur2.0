import { useMemo } from "react";
import {
  createColumnHelper,
  type ColumnDef,
} from "@tanstack/react-table";
import { Badge, Copy, Text } from "@medusajs/ui";
import type { CustomerBankAccountVerification } from "../types";
import { DateCell, DateHeader } from "./date-cell";

const columnHelper = createColumnHelper<CustomerBankAccountVerification>();

type UseCustomerBankAccountVerificationTableColumnsProps = {
  exclude?: string[];
};

export const useCustomerBankAccountVerificationListTableColumns = (
  props: UseCustomerBankAccountVerificationTableColumnsProps
) => {
  const { exclude = [] } = props ?? {};

  const columns = useMemo(
    () => [
      columnHelper.accessor("id", {
        header: "Id",
        cell: ({ getValue }) => getValue(),
      }),
      columnHelper.accessor("customer_refund_method_id", {
        header: "Customer Refund Method Id",
        cell: ({ getValue }) => {
          const value = getValue();
          if (!value) return "NA";
          return (
            <div className="flex h-full w-full items-center">
              <Text size="small" className="truncate">
                {value}
                <Copy content={`${value}`} className="text-ui-fg-muted" />
              </Text>
            </div>
          );
        },
      }),
      columnHelper.accessor("fav_id", {
        header: "FAV Id",
        cell: ({ getValue }) => {
          const value = getValue();
          if (!value) return "NA";
          return (
            <div className="flex h-full w-full items-center">
              <Text size="small" className="truncate">
                {value}
                <Copy content={`${value}`} className="text-ui-fg-muted" />
              </Text>
            </div>
          );
        },
      }),
      columnHelper.accessor("fund_account_id", {
        header: "Fund Account Id",
        cell: ({ getValue }) => {
          const value = getValue();
          if (!value) return "NA";
          return (
            <div className="flex h-full w-full items-center">
              <Text size="small" className="truncate">
                {value}
                <Copy content={`${value}`} className="text-ui-fg-muted" />
              </Text>
            </div>
          );
        },
      }),
      columnHelper.accessor("contact_id", {
        header: "Contact Id",
        cell: ({ getValue }) => {
          const value = getValue();
          if (!value) return "NA";
          return (
            <div className="flex h-full w-full items-center">
              <Text size="small" className="truncate">
                {value}
                <Copy content={`${value}`} className="text-ui-fg-muted" />
              </Text>
            </div>
          );
        },
      }),
      columnHelper.accessor("registered_name", {
        header: "Registered Name",
        cell: ({ getValue }) => getValue() || "NA",
      }),
      columnHelper.accessor("bank_account_status", {
        header: "Bank Account Status",
        cell: ({ getValue }) => {
          const value = getValue();
          if (!value) return "NA";
          return <Badge color={value === "active" ? "green" : "red"}>{value}</Badge>;
        },
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: ({ getValue }) => {
          const value = getValue();
          if (!value) return "NA";
          return <Badge color={value === "completed" ? "green" : "red"}>{value}</Badge>;
        },
      }),
      columnHelper.accessor("created_at", {
        header: () => <DateHeader />,
        cell: ({ getValue, row }) => (
          <DateCell date={getValue()} updated_at_date={row.original.updated_at} />
        ),
      }),
    ] as ColumnDef<CustomerBankAccountVerification>[],
    []
  );

  return columns.filter((column) => {
    const key = "accessorKey" in column ? String(column.accessorKey) : column.id || "";
    return !exclude.includes(key);
  });
};
