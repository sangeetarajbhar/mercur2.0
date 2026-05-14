import { useMemo } from "react";
import { createColumnHelper, type ColumnDef } from "@tanstack/react-table";
import { Badge, Copy, Text } from "@medusajs/ui";
import { Eye } from "@medusajs/icons";
import { useNavigate } from "react-router-dom";
import { ActionsButton } from "../../../common/ActionsButton";
import type { CustomerBankDetail } from "../types";
import { DateCell, DateHeader } from "./date-cell";

const columnHelper = createColumnHelper<CustomerBankDetail>();

type UseCustomerBankDetailTableColumnsProps = {
  exclude?: string[];
};

export const useCustomerBankDetailListTableColumns = (
  props: UseCustomerBankDetailTableColumnsProps
) => {
  const { exclude = [] } = props ?? {};
  const navigate = useNavigate();

  const columns = useMemo(
    () =>
      [
        columnHelper.accessor("id", {
          header: "Id",
          cell: ({ getValue }) => getValue(),
        }),
        columnHelper.accessor("customer_bank_account_verification_id", {
          header: "Customer Bank Account Verification Id",
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
        columnHelper.accessor("masked_holder", {
          header: "Masked Holder Name",
          cell: ({ getValue }) => getValue() || "NA",
        }),
        columnHelper.accessor("masked_account", {
          header: "Masked Account No.",
          cell: ({ getValue }) => getValue() || "NA",
        }),
        columnHelper.accessor("status", {
          header: "Status",
          cell: ({ getValue }) => {
            const status = getValue();
            if (!status) return "NA";
            return <Badge color={status === "active" ? "green" : "red"}>{status}</Badge>;
          },
        }),
        columnHelper.accessor("created_at", {
          header: () => <DateHeader />,
          cell: ({ getValue, row }) => (
            <DateCell date={getValue()} updated_at_date={row.original.updated_at} />
          ),
        }),
        columnHelper.display({
          id: "actions",
          header: () => "Action",
          cell: ({ row }) => (
            <ActionsButton
              actions={[
                {
                  label: "View record",
                  onClick: () => navigate(`/customer-bank-detail/${row.original.id}`),
                  icon: <Eye />,
                },
              ]}
            />
          ),
        }),
      ] as ColumnDef<CustomerBankDetail>[],
    [navigate]
  );

  return columns.filter((column) => {
    const key = "accessorKey" in column ? String(column.accessorKey) : column.id || "";
    return !exclude.includes(key);
  });
};
