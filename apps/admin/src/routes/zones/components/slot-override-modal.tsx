import { zodResolver } from "@hookform/resolvers/zod"
import {
  Button,
  toast,
  FocusModal,
  Input,
  Heading,
  Text,
  Tabs
} from "@medusajs/ui"
import { FormProvider, useForm, useFieldArray } from "react-hook-form"
import { useEffect, useMemo, useState, useRef } from "react"
import { z } from "zod"
import { useCreateSlotOverride, useSlotOverrides, useUpdateSlotOverride } from "../../../hooks/api/slot-overrides.tsx"
import { SlotDefinition, useSlotDefinitions } from "../../../hooks/api/slot-definitions"

// Single slot override schema
const SingleSlotOverrideSchema = z.object({
  id: z.string().optional(), // For editing existing overrides
  slot_key: z.string().min(1, "Slot key is required"),
  start_time: z.string().min(1, "Start time is required").regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format"),
  end_time: z.string().min(1, "End time is required").regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format"),
  cut_off_time: z.string().min(1, "Cut-off time is required").regex(/^\d{2}:\d{2}$/, "Cut-off time must be in HH:MM format"),
  // Allow 0 so user can effectively "disable" a slot by setting capacity to 0
  total_capacity: z.number().min(0, "Total capacity cannot be negative"),
  remaining_capacity: z.number().min(0, "Remaining capacity cannot be negative"),
  is_active: z.boolean().default(true), // Keep for backend, but hidden in UI
  __fromDefinition: z.boolean().optional(), // UI helper flag (not persisted)
}).refine((data) => {
  const startTime = new Date(`2000-01-01T${data.start_time}:00`)
  const endTime = new Date(`2000-01-01T${data.end_time}:00`)
  return endTime > startTime
}, {
  message: "End time must be after start time",
  path: ["end_time"]
}).refine((data) => {
  // Validate cut-off time: it must be before start time
  const startTime = new Date(`2000-01-01T${data.start_time}:00`)
  const cutOffTime = new Date(`2000-01-01T${data.cut_off_time}:00`)
  return cutOffTime < startTime
}, {
  message: "Cut-off time must be before start time",
  path: ["cut_off_time"]
}).refine((data) => {
  return data.remaining_capacity <= data.total_capacity
}, {
  message: "Remaining capacity cannot exceed total capacity",
  path: ["remaining_capacity"]
})

// Bulk slot override schema with tabs for today and tomorrow
const BulkSlotOverrideSchema = z.object({
  today_slots: z.array(SingleSlotOverrideSchema).min(0, "At least one slot is required for today"),
  tomorrow_slots: z.array(SingleSlotOverrideSchema).min(0, "At least one slot is required for tomorrow")
})

type BulkSlotOverrideSchemaType = z.infer<typeof BulkSlotOverrideSchema>

type SlotRowField = {
  fieldId: string
}

interface SlotOverrideModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  zoneId: string
}

const SlotOverrideModal = ({
  open,
  onOpenChange,
  onSuccess,
  zoneId
}: SlotOverrideModalProps) => {
  const { mutateAsync: createSlotOverride, isPending: isCreating } = useCreateSlotOverride()
  const { mutateAsync: updateSlotOverride, isPending: isUpdating } = useUpdateSlotOverride()
  const { data: slotDefinitionsData } = useSlotDefinitions(zoneId)

  // Compute today/tomorrow once per open/render cycle (stable values for queries + filtering)
  const { todayDate, tomorrowDate } = useMemo(() => {
    const now = new Date()
    const today = now.toISOString().split("T")[0]
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split("T")[0]
    return { todayDate: today, tomorrowDate: tomorrowStr }
  }, [])

  // Fetch slot overrides for today and tomorrow specifically
  // Note: The API has a default limit of 100, which should be enough for all overrides
  const { data: slotOverridesData } = useSlotOverrides(zoneId, {
    slot_date: [todayDate, tomorrowDate]
  })

  const slotDefinitions = slotDefinitionsData?.slot_definitions || []
  const slotOverrides = slotOverridesData?.slot_overrides || []

  const [activeTab, setActiveTab] = useState<"today" | "tomorrow">("today")
  const [editedTabs, setEditedTabs] = useState<Set<"today" | "tomorrow">>(new Set())

  // Track if modal was previously open to detect open transitions
  const prevOpenRef = useRef(open)

  // Utility to normalize time format to HH:MM (strip seconds if present)
  const normalizeTimeFormat = (time: string): string => {
    if (!time) return ""
    // If time has seconds (HH:MM:SS), strip them to get HH:MM
    // Also handle edge cases like "09:30" vs "9:30"
    const parts = time.split(':')
    if (parts.length >= 2) {
      const hours = parts[0].padStart(2, '0')
      const minutes = parts[1].padStart(2, '0')
      return `${hours}:${minutes}`
    }
    return time
  }

  // Convert slot definition to slot override format
  const slotDefinitionToOverride = (slot: SlotDefinition) => ({
    slot_key: slot.slot_key,
    start_time: normalizeTimeFormat(slot.start_time),
    end_time: normalizeTimeFormat(slot.end_time),
    cut_off_time: slot.cut_off_time ? normalizeTimeFormat(slot.cut_off_time) : null,
    total_capacity: slot.default_capacity,
    remaining_capacity: slot.default_capacity,
    is_active: slot.is_active,
    __fromDefinition: true
  })

  // Convert existing slot override to form format
  const slotOverrideToForm = (override: typeof slotOverrides[0]) => {
    // Normalize time formats first
    const normalizedStartTime = normalizeTimeFormat(override.start_time)
    const normalizedEndTime = normalizeTimeFormat(override.end_time)

    // Try to find the original slot key from slot definitions if not stored
    let slotKey = override.slot_key
    if (!slotKey) {
      const matchingSlotDefinition = slotDefinitions.find(slot =>
        normalizeTimeFormat(slot.start_time) === normalizedStartTime &&
        normalizeTimeFormat(slot.end_time) === normalizedEndTime
      )
      slotKey = matchingSlotDefinition?.slot_key || `${normalizedStartTime}-${normalizedEndTime}`
    }

    return {
      id: override.id,
      slot_key: slotKey,
      start_time: normalizedStartTime,
      end_time: normalizedEndTime,
      cut_off_time: override.cut_off_time ? normalizeTimeFormat(override.cut_off_time) : null,
      total_capacity: override.total_capacity,
      remaining_capacity: override.remaining_capacity,
      is_active: override.is_active
    }
  }

  // Get default values - ALWAYS prioritize existing overrides, show ALL of them
  // Only use slot definitions as defaults when NO overrides exist
  const getDefaultValues = (): BulkSlotOverrideSchemaType => {
    const activeSlotDefinitions = slotDefinitions.filter(s => s.is_active)

    // Get existing overrides for today and tomorrow
    // Filter by slot_date matching today or tomorrow
    const todayOverrides = slotOverrides.filter(o => {
      const overrideDate = o.slot_date
      return overrideDate === todayDate
    })
    const tomorrowOverrides = slotOverrides.filter(o => {
      const overrideDate = o.slot_date
      return overrideDate === tomorrowDate
    })

    // Determine today's slots - ALWAYS show existing overrides if they exist
    let todaySlots
    if (todayOverrides.length > 0) {
      // Use ALL existing overrides for today (even if more than definitions)
      todaySlots = todayOverrides.map(slotOverrideToForm)
    } else if (activeSlotDefinitions.length > 0) {
      // Only use slot definitions as default when NO overrides exist
      todaySlots = activeSlotDefinitions.map(slotDefinitionToOverride)
    } else {
      // Empty default
      todaySlots = [{
        slot_key: "",
        start_time: "",
        end_time: "",
        cut_off_time: null,
        total_capacity: 1,
        remaining_capacity: 1,
        is_active: true
      }]
    }

    // Determine tomorrow's slots - ALWAYS show existing overrides if they exist
    let tomorrowSlots
    if (tomorrowOverrides.length > 0) {
      // Use ALL existing overrides for tomorrow (even if more than definitions)
      tomorrowSlots = tomorrowOverrides.map(slotOverrideToForm)
    } else if (activeSlotDefinitions.length > 0) {
      // Only use slot definitions as default when NO overrides exist
      tomorrowSlots = activeSlotDefinitions.map(slotDefinitionToOverride)
    } else {
      // Empty default
      tomorrowSlots = [{
        slot_key: "",
        start_time: "",
        end_time: "",
        cut_off_time: null,
        total_capacity: 1,
        remaining_capacity: 1,
        is_active: true
      }]
    }

    return {
      today_slots: todaySlots,
      tomorrow_slots: tomorrowSlots
    }
  }

  const form = useForm<BulkSlotOverrideSchemaType>({
    resolver: zodResolver(BulkSlotOverrideSchema),
    defaultValues: getDefaultValues()
  })

  const { fields: todayFields, append: appendTodaySlot, remove: removeTodaySlot } = useFieldArray({
    control: form.control,
    name: "today_slots",
    // Avoid collision with our DB `id` field in the form values
    keyName: "fieldId",
  })

  const { fields: tomorrowFields, append: appendTomorrowSlot, remove: removeTomorrowSlot } = useFieldArray({
    control: form.control,
    name: "tomorrow_slots",
    // Avoid collision with our DB `id` field in the form values
    keyName: "fieldId",
  })

  // Reset form when modal opens, using latest fetched slotOverrides
  useEffect(() => {
    const wasOpen = prevOpenRef.current
    prevOpenRef.current = open

    // Reset when modal opens (transitions from closed to open)
    if (open && !wasOpen) {
      const defaultValues = getDefaultValues()
      form.reset(defaultValues)
      setEditedTabs(new Set())
    }
  }, [open])

  const isLoading = isCreating || isUpdating

  const handleSubmit = form.handleSubmit(
    async (values) => {
      try {
        let totalOperations = 0

        // Determine which tabs to process
        // If no tabs are marked as edited, only process the active tab (user wants to save current tab)
        let tabsToProcess = editedTabs
        if (editedTabs.size === 0) {
          tabsToProcess = new Set([activeTab])
        }

        const shouldProcessToday = tabsToProcess.has("today")
        const shouldProcessTomorrow = tabsToProcess.has("tomorrow")

        // Check if the tabs we're supposed to process have any slots
        const hasTodaySlots = shouldProcessToday && values.today_slots.length > 0
        const hasTomorrowSlots = shouldProcessTomorrow && values.tomorrow_slots.length > 0

        if (!hasTodaySlots && !hasTomorrowSlots) {
          toast.info("No slots to save")
          onOpenChange(false)
          return
        }

        if (hasTodaySlots) {
          // Handle today's slots - create or update only (no deletion)
          // Slot overrides cannot be deleted once created, only edited
          for (const slot of values.today_slots) {
            // Ensure we have a valid slot_key
            const slotKey = slot.slot_key || `${slot.start_time}-${slot.end_time}`

            if (slot.id) {
              // Update existing override
              await updateSlotOverride({
                zoneId,
                overrideId: slot.id,
                data: {
                  slot_date: todayDate,
                  slot_key: slotKey,
                  start_time: slot.start_time,
                  end_time: slot.end_time,
                  cut_off_time: slot.cut_off_time || null,
                  total_capacity: slot.total_capacity,
                  remaining_capacity: slot.remaining_capacity,
                  is_active: slot.is_active
                }
              })
            } else {
              // Create new override
              await createSlotOverride({
                zoneId,
                data: {
                  slot_date: todayDate,
                  slot_key: slotKey,
                  start_time: slot.start_time,
                  end_time: slot.end_time,
                  cut_off_time: slot.cut_off_time,
                  total_capacity: slot.total_capacity,
                  remaining_capacity: slot.remaining_capacity,
                  is_active: slot.is_active
                }
              })
            }
            totalOperations++
          }
        }

        if (hasTomorrowSlots) {
          // Handle tomorrow's slots - create or update only (no deletion)
          // Slot overrides cannot be deleted once created, only edited
          for (const slot of values.tomorrow_slots) {
            // Ensure we have a valid slot_key
            const slotKey = slot.slot_key || `${slot.start_time}-${slot.end_time}`

            if (slot.id) {
              // Update existing override
              await updateSlotOverride({
                zoneId,
                overrideId: slot.id,
                data: {
                  slot_date: tomorrowDate,
                  slot_key: slotKey,
                  start_time: slot.start_time,
                  end_time: slot.end_time,
                  cut_off_time: slot.cut_off_time,
                  total_capacity: slot.total_capacity,
                  remaining_capacity: slot.remaining_capacity,
                  is_active: slot.is_active
                }
              })
            } else {
              // Create new override
              await createSlotOverride({
                zoneId,
                data: {
                  slot_date: tomorrowDate,
                  slot_key: slotKey,
                  start_time: slot.start_time,
                  end_time: slot.end_time,
                  cut_off_time: slot.cut_off_time,
                  total_capacity: slot.total_capacity,
                  remaining_capacity: slot.remaining_capacity,
                  is_active: slot.is_active
                }
              })
            }
            totalOperations++
          }
        }

        toast.success(`Successfully saved ${totalOperations} slot override(s)`)

        form.reset()
        setEditedTabs(new Set())
        onOpenChange(false)
        onSuccess?.()
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to save slot overrides'
        toast.error(`Submission failed: ${errorMessage}`)
      }
    },
    () => {
      toast.error("Please fix the form errors before submitting")
    }
  )

  const handleClose = () => {
    form.reset()
    setEditedTabs(new Set())
    onOpenChange(false)
  }

  const renderSlotTable = (
    fields: SlotRowField[],
    fieldNamePrefix: "today_slots" | "tomorrow_slots",
    tabName: "today" | "tomorrow"
  ) => {
    const appendSlot = tabName === "today" ? appendTodaySlot : appendTomorrowSlot
    const removeSlot = tabName === "today" ? removeTodaySlot : removeTomorrowSlot

    return (
      <div className="overflow-x-auto">
        <div className="flex justify-end mb-2">
          <Button
            type="button"
            variant="secondary"
            size="small"
            onClick={() => {
              appendSlot({
                slot_key: "",
                start_time: "",
                end_time: "",
                cut_off_time: null,
                total_capacity: 1,
                remaining_capacity: 1,
                is_active: true,
                __fromDefinition: false,
              })
              setEditedTabs(prev => new Set(prev).add(tabName))
            }}
          >
            Add New Slot
          </Button>
        </div>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-ui-border-base">
              <th className="text-left py-2 px-2 text-ui-fg-subtle text-xs font-medium min-w-[150px]">
                Slot Key *
              </th>
              <th className="text-left py-2 px-2 text-ui-fg-subtle text-xs font-medium min-w-[100px]">
                Start Time *
              </th>
              <th className="text-left py-2 px-2 text-ui-fg-subtle text-xs font-medium min-w-[100px]">
                End Time *
              </th>
              <th className="text-left py-2 px-2 text-ui-fg-subtle text-xs font-medium min-w-[100px]">
                Cut-off Time *
              </th>
              <th className="text-left py-2 px-2 text-ui-fg-subtle text-xs font-medium min-w-[120px]">
                Total Capacity *
              </th>
              <th className="text-left py-2 px-2 text-ui-fg-subtle text-xs font-medium min-w-[140px]">
                Remaining Capacity *
              </th>
              <th className="text-left py-2 px-2 text-ui-fg-subtle text-xs font-medium min-w-[90px]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {fields.map((field, index) => {
              const existingOverrideId = form.watch(`${fieldNamePrefix}.${index}.id`)
              const fromDefinition = form.watch(`${fieldNamePrefix}.${index}.__fromDefinition`)
              // Keep RHF field state in sync for cut-off time (we normalize via setValue below)
              const cutOffTimeRegister = form.register(`${fieldNamePrefix}.${index}.cut_off_time`)
              return (
                <tr key={field.fieldId} className="border-b border-ui-border-base">
                  <td className="py-2 px-2">
                    <Input
                      {...form.register(`${fieldNamePrefix}.${index}.slot_key`)}
                      placeholder="e.g., morning-slot"
                      size="small"
                      onChange={(e) => {
                        form.register(`${fieldNamePrefix}.${index}.slot_key`).onChange(e)
                        setEditedTabs(prev => new Set(prev).add(tabName))
                      }}
                    />
                    {form.formState.errors[fieldNamePrefix]?.[index]?.slot_key && (
                      <Text className="text-xs mt-1" style={{ color: '#ef4444' }}>
                        {form.formState.errors[fieldNamePrefix][index]?.slot_key?.message}
                      </Text>
                    )}
                  </td>
                  <td className="py-2 px-2">
                    <Input
                      type="time"
                      {...form.register(`${fieldNamePrefix}.${index}.start_time`)}
                      size="small"
                      disabled={!!existingOverrideId}
                      onChange={(e) => {
                        // Convert HH:MM:SS to HH:MM format if needed
                        const timeValue = e.target.value
                        const normalizedTime = timeValue.length > 5 ? timeValue.substring(0, 5) : timeValue
                        form.setValue(`${fieldNamePrefix}.${index}.start_time`, normalizedTime)
                        setEditedTabs(prev => new Set(prev).add(tabName))
                      }}
                    />
                    {form.formState.errors[fieldNamePrefix]?.[index]?.start_time && (
                      <Text className="text-xs mt-1" style={{ color: '#ef4444' }}>
                        {form.formState.errors[fieldNamePrefix][index]?.start_time?.message}
                      </Text>
                    )}
                  </td>
                  <td className="py-2 px-2">
                    <Input
                      type="time"
                      {...form.register(`${fieldNamePrefix}.${index}.end_time`)}
                      size="small"
                      disabled={!!existingOverrideId}
                      onChange={(e) => {
                        // Convert HH:MM:SS to HH:MM format if needed
                        const timeValue = e.target.value
                        const normalizedTime = timeValue.length > 5 ? timeValue.substring(0, 5) : timeValue
                        form.setValue(`${fieldNamePrefix}.${index}.end_time`, normalizedTime)
                        setEditedTabs(prev => new Set(prev).add(tabName))
                      }}
                    />
                    {form.formState.errors[fieldNamePrefix]?.[index]?.end_time && (
                      <Text className="text-xs mt-1" style={{ color: '#ef4444' }}>
                        {form.formState.errors[fieldNamePrefix][index]?.end_time?.message}
                      </Text>
                    )}
                  </td>
                  <td className="py-2 px-2">
                    <Input
                      type="time"
                      {...cutOffTimeRegister}
                      size="small"
                      onChange={(e) => {
                        // Ensure RHF captures the change (otherwise value can remain null in payload)
                        cutOffTimeRegister.onChange(e)
                        // Convert HH:MM:SS to HH:MM format if needed
                        const timeValue = e.target.value
                        const normalizedTime = timeValue.length > 5 ? timeValue.substring(0, 5) : timeValue
                        form.setValue(`${fieldNamePrefix}.${index}.cut_off_time`, normalizedTime || null)
                        setEditedTabs(prev => new Set(prev).add(tabName))
                      }}
                    />
                    {form.formState.errors[fieldNamePrefix]?.[index]?.cut_off_time && (
                      <Text className="text-xs mt-1" style={{ color: '#ef4444' }}>
                        {form.formState.errors[fieldNamePrefix][index]?.cut_off_time?.message}
                      </Text>
                    )}
                  </td>
                  <td className="py-2 px-2">
                    <Input
                      type="number"
                      {...form.register(`${fieldNamePrefix}.${index}.total_capacity`, { valueAsNumber: true })}
                      placeholder="10"
                      min="0"
                      size="small"
                      onChange={(e) => {
                        form.register(`${fieldNamePrefix}.${index}.total_capacity`, { valueAsNumber: true }).onChange(e)
                        setEditedTabs(prev => new Set(prev).add(tabName))
                      }}
                    />
                    {form.formState.errors[fieldNamePrefix]?.[index]?.total_capacity && (
                      <Text className="text-xs mt-1" style={{ color: '#ef4444' }}>
                        {form.formState.errors[fieldNamePrefix][index]?.total_capacity?.message}
                      </Text>
                    )}
                  </td>
                  <td className="py-2 px-2">
                    <Input
                      type="number"
                      {...form.register(`${fieldNamePrefix}.${index}.remaining_capacity`, { valueAsNumber: true })}
                      placeholder="10"
                      min="0"
                      size="small"
                      onChange={(e) => {
                        form.register(`${fieldNamePrefix}.${index}.remaining_capacity`, { valueAsNumber: true }).onChange(e)
                        setEditedTabs(prev => new Set(prev).add(tabName))
                      }}
                    />
                    {form.formState.errors[fieldNamePrefix]?.[index]?.remaining_capacity && (
                      <Text className="text-xs mt-1" style={{ color: '#ef4444' }}>
                        {form.formState.errors[fieldNamePrefix][index]?.remaining_capacity?.message}
                      </Text>
                    )}
                  </td>
                  <td className="py-2 px-2">
                    {!existingOverrideId && !fromDefinition ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="small"
                        onClick={() => {
                          removeSlot(index)
                          setEditedTabs(prev => new Set(prev).add(tabName))
                        }}
                      >
                        Remove
                      </Button>
                    ) : (
                      <Text size="small" className="text-ui-fg-subtle">
                        —
                      </Text>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmit}>
        <FocusModal open={open} onOpenChange={handleClose}>
          <FocusModal.Content>
            <FocusModal.Header>
              <Heading level="h2">
                Manage Slot Overrides
              </Heading>
            </FocusModal.Header>

            <FocusModal.Body className="flex flex-1 flex-col overflow-y-auto">
              <div className="flex w-full flex-col gap-y-6 px-6 py-8">
                <div>
                  <Heading className="capitalize">
                    Slot Overrides
                  </Heading>
                  <Text size="small" className="text-ui-fg-subtle">
                    Create and edit slot overrides for today ({todayDate}) and tomorrow ({tomorrowDate}).
                    You can add new slots or update existing ones. To disable a slot, set its Total Capacity to 0.
                  </Text>
                </div>

                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "today" | "tomorrow")}>
                  <Tabs.List>
                    <Tabs.Trigger value="today">
                      Today ({todayDate}) - {todayFields.length} slot{todayFields.length !== 1 ? 's' : ''}
                    </Tabs.Trigger>
                    <Tabs.Trigger value="tomorrow">
                      Tomorrow ({tomorrowDate}) - {tomorrowFields.length} slot{tomorrowFields.length !== 1 ? 's' : ''}
                    </Tabs.Trigger>
                  </Tabs.List>

                  <Tabs.Content value="today" className="mt-6">
                    {renderSlotTable(todayFields, "today_slots", "today")}
                  </Tabs.Content>

                  <Tabs.Content value="tomorrow" className="mt-6">
                    {renderSlotTable(tomorrowFields, "tomorrow_slots", "tomorrow")}
                  </Tabs.Content>
                </Tabs>
              </div>
            </FocusModal.Body>

            <FocusModal.Footer>
              <div className="flex items-center justify-end gap-x-2">
                <Button
                  variant="secondary"
                  size="small"
                  onClick={handleClose}
                  disabled={form.formState.isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  size="small"
                  type="button"
                  isLoading={isLoading}
                  onClick={async (e) => {
                    e.preventDefault()
                    const isValid = await form.trigger()
                    if (isValid) {
                      await handleSubmit()
                    } else {
                      // Create a more detailed error message
                      const errors = form.formState.errors
                      const errorMessages: string[] = []

                      if (errors.today_slots && Array.isArray(errors.today_slots)) {
                        errors.today_slots.forEach((slotError, index) => {
                          if (slotError && typeof slotError === 'object') {
                            Object.entries(slotError).forEach(([field, error]) => {
                              if (error && typeof error === 'object' && 'message' in error && error.message) {
                                errorMessages.push(`Today slot ${index + 1} - ${field}: ${String(error.message)}`)
                              }
                            })
                          }
                        })
                      }

                      if (errors.tomorrow_slots && Array.isArray(errors.tomorrow_slots)) {
                        errors.tomorrow_slots.forEach((slotError, index) => {
                          if (slotError && typeof slotError === 'object') {
                            Object.entries(slotError).forEach(([field, error]) => {
                              if (error && typeof error === 'object' && 'message' in error && error.message) {
                                errorMessages.push(`Tomorrow slot ${index + 1} - ${field}: ${String(error.message)}`)
                              }
                            })
                          }
                        })
                      }

                      if (errorMessages.length > 0) {
                        toast.error(`Validation errors: ${errorMessages[0]}`)
                      } else {
                        toast.error("Please fix the form errors before submitting")
                      }
                    }
                  }}
                >
                  Save Overrides
                </Button>
              </div>
            </FocusModal.Footer>
          </FocusModal.Content>
        </FocusModal>
      </form>
    </FormProvider>
  )
}

export default SlotOverrideModal
