import {
    Badge,
    DataTable,
    useDataTable,
    createDataTableColumnHelper,
    Text,
  } from "@medusajs/ui"
  import { useMemo } from "react"
  import { useSlotOverrides } from "../../../hooks/api/slot-overrides.tsx"
  import { getTodayIST, getTomorrowIST } from "../../../workflows/delivery-promise/utils/date-time-utils"
  
  interface SlotOverridesListProps {
    zoneId: string
  }
  
  interface DisplaySlot {
    id: string
    date: string
    slot_key: string
    start_time: string
    end_time: string
    cut_off_time?: string | null
    total_capacity: number
    remaining_capacity: number
    is_active: boolean
    isOverride: boolean
  }
  
  const columnHelper = createDataTableColumnHelper<DisplaySlot>()
  
  const SlotOverridesList = ({ zoneId }: SlotOverridesListProps) => {
    // Get today's and tomorrow's dates in IST timezone (YYYY-MM-DD format)
    // This matches how slot_overrides are stored in the database
    const now = new Date()
    const todayDate = getTodayIST(now)
    const tomorrowDate = getTomorrowIST(now)
  
    // Fetch only today and tomorrow's slots from API (server-side filtering)
    const { data: overridesData, isLoading: overridesLoading } = useSlotOverrides(zoneId, {
      slot_date: [todayDate, tomorrowDate]
    })
  
    const slotOverrides = overridesData?.slot_overrides || []
  
    // Separate overrides for today and tomorrow (data is already filtered by API)
    const todayOverrides = slotOverrides.filter(o => o.slot_date === todayDate)
    const tomorrowOverrides = slotOverrides.filter(o => o.slot_date === tomorrowDate)
  
    // Build display slots for today and tomorrow
    const displaySlots: DisplaySlot[] = useMemo(() => {
      const slots: DisplaySlot[] = []
  
      // Today's slots - ONLY show if overrides exist
      todayOverrides.forEach(override => {
        slots.push({
          id: `override-today-${override.id}`,
          date: todayDate,
          slot_key: override.slot_key || `${override.start_time}-${override.end_time}`,
          start_time: override.start_time,
          end_time: override.end_time,
          cut_off_time: override.cut_off_time || null,
          total_capacity: override.total_capacity,
          remaining_capacity: override.remaining_capacity,
          is_active: override.is_active,
          isOverride: true
        })
      })
  
      // Tomorrow's slots - ONLY show if overrides exist
      tomorrowOverrides.forEach(override => {
        slots.push({
          id: `override-tomorrow-${override.id}`,
          date: tomorrowDate,
          slot_key: override.slot_key || `${override.start_time}-${override.end_time}`,
          start_time: override.start_time,
          end_time: override.end_time,
          cut_off_time: override.cut_off_time || null,
          total_capacity: override.total_capacity,
          remaining_capacity: override.remaining_capacity,
          is_active: override.is_active,
          isOverride: true
        })
      })
  
      return slots
    }, [todayOverrides, tomorrowOverrides, todayDate, tomorrowDate])
  
    const columns = useMemo(
      () => [
        columnHelper.accessor("date", {
          header: "Date",
          cell: (info) => {
            const dateStr = info.getValue()
            const date = new Date(dateStr)
            const isToday = dateStr === todayDate
            const isTomorrow = dateStr === tomorrowDate
  
            return (
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {date.toLocaleDateString()}
                </span>
                {isToday && (
                  <Badge color="purple" size="xsmall">Today</Badge>
                )}
                {isTomorrow && (
                  <Badge color="orange" size="xsmall">Tomorrow</Badge>
                )}
              </div>
            )
          },
        }),
        columnHelper.accessor("slot_key", {
          header: "Slot Key",
        }),
        columnHelper.accessor("start_time", {
          header: "Time Slot",
          cell: (info) => {
            const row = info.row.original
            return (
              <div>
                {info.getValue()} - {row.end_time}
              </div>
            )
          },
        }),
        columnHelper.accessor("cut_off_time", {
          header: "Cut-off Time",
          cell: (info) => {
            const cutOffTime = info.getValue()
            return (
              <Text size="small" className={cutOffTime ? "" : "text-ui-fg-subtle"}>
                {cutOffTime || "—"}
              </Text>
            )
          },
        }),
        columnHelper.accessor("total_capacity", {
          header: "Total Capacity",
        }),
        columnHelper.accessor("remaining_capacity", {
          header: "Remaining",
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
        columnHelper.accessor("isOverride", {
          header: "Source",
          cell: (info) => {
            const isOverride = info.getValue()
            return (
              <Badge color={isOverride ? "blue" : "grey"} size="small">
                {isOverride ? "Override" : "Default"}
              </Badge>
            )
          },
        }),
      ],
      [todayDate, tomorrowDate]
    )
  
    const table = useDataTable({
      columns,
      data: displaySlots,
      getRowId: (row) => row.id,
      rowCount: displaySlots.length,
      isLoading: overridesLoading,
    })
  
    if (displaySlots.length === 0) {
      return (
        <div className="text-center py-8 text-ui-fg-muted">
          <Text>No slot overrides created for today or tomorrow.</Text>
          <Text className="text-sm mt-1">Use "Manage Overrides" to create custom schedules.</Text>
        </div>
      )
    }
  
    return (
      <DataTable instance={table}>
        <DataTable.Table />
      </DataTable>
    )
  }
  
  export default SlotOverridesList
  