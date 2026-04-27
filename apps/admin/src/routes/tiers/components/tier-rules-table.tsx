import {
  Heading,
  DataTable,
  createDataTableColumnHelper,
  useDataTable,
  Container,
} from "@medusajs/ui";

import { TierRule } from "../types";

type TierRulesTableProps = {
  tierRules: TierRule[];
};

const columnHelper = createDataTableColumnHelper<TierRule>();

const columns = [
  columnHelper.accessor("currency_code", {
    header: "Currency",
    cell: ({ getValue }) => {
      const currencyCode = getValue();
      return currencyCode.toUpperCase();
    },
  }),
  columnHelper.accessor("min_purchase_value", {
    header: "Minimum Purchase Value",
    cell: ({ getValue }) => {
      const value = getValue();
      return value.toLocaleString();
    },
  }),
];

export const TierRulesTable = ({ tierRules }: TierRulesTableProps) => {
  const table = useDataTable({
    columns,
    data: tierRules || [],
    getRowId: (rule) => rule.id,
    rowCount: tierRules?.length || 0,
    isLoading: false,
  });

  if (!tierRules || tierRules.length === 0) {
    return null;
  }

  return (
    <Container className="divide-y p-0">
      <DataTable instance={table}>
        <DataTable.Toolbar className="flex items-center justify-between px-6 py-4">
          <Heading level="h2">Tier Rules</Heading>
        </DataTable.Toolbar>
        <DataTable.Table />
      </DataTable>
    </Container>
  );
};
