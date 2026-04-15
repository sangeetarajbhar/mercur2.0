import {
    Badge,
    DataTable,
    useDataTable,
    createDataTableColumnHelper,
  } from "@medusajs/ui"
  import { useMemo } from "react"
  import { SlotDefinition, useSlotDefinitions } from "../../../hooks/api/slot-definitions"
  
  interface SlotDefinitionsListProps {
    zoneId: string
    onEdit?: (slot: SlotDefinition) => void
  }
  
  const columnHelper = createDataTableColumnHelper<SlotDefinition>()
  
  const SlotDefinitionsList = ({ zoneId, onEdit }: SlotDefinitionsListProps) => {
    const { data, isLoading } = useSlotDefinitions(zoneId)
    const slotDefinitions = data?.slot_definitions || []
  
    const columns = useMemo(
      () => [
        columnHelper.accessor("slot_key", {
          header: "Slot Key",
        }),
        columnHelper.accessor("start_time", {
          header: "Start Time",
        }),
        columnHelper.accessor("end_time", {
          header: "End Time",
        }),
        columnHelper.accessor("cut_off_time", {
          header: "Cut-off Time",
        }),
        columnHelper.accessor("default_capacity", {
          header: "Capacity",
        }),
        columnHelper.accessor("is_active", {
          header: "Status",
          cell: (info) => {
            const isActive = info.getValue()
            return (
              <Badge color={isActive ? "green" : "red"} size="small">
                {isActive ? "Active" : "Inactive"}
              </Badge>
            )
          },
        }),
      ],
      []
    )
  
    const table = useDataTable({
      columns,
      data: slotDefinitions,
      getRowId: (row) => row.id,
      rowCount: slotDefinitions.length,
      isLoading,
      onRowClick: onEdit ? (_, row) => onEdit(row) : undefined,
    })
  
    return (
      <div className={onEdit ? "[&_tbody_tr]:cursor-pointer [&_tbody_tr:hover]:bg-ui-bg-subtle-hover" : ""}>
        <DataTable instance={table}>
          <DataTable.Table />
        </DataTable>
      </div>
    )
  }
  
  export default SlotDefinitionsList
  