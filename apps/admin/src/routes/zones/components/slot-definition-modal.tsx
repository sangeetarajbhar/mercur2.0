import { zodResolver } from "@hookform/resolvers/zod"
import { 
  Button, 
  toast, 
  FocusModal, 
  Input, 
  Switch, 
  Heading,
  Text,
  IconButton
} from "@medusajs/ui"
import { Plus, Trash } from "@medusajs/icons"
import { FormProvider, useForm, useFieldArray } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useEffect, useState } from "react"
import { z } from "zod"
import { SlotDefinition, useCreateBulkSlotDefinitions, useBulkUpdateSlotDefinitions } from "../../../hooks/api/slot-definitions"
import { FrontendModalSlotSchema } from "../../../api/admin/zones/validation/slot-validation"

const SingleSlotSchema = FrontendModalSlotSchema

const BulkSlotDefinitionSchema = z.object({
  slots: z.array(SingleSlotSchema).min(1, "At least one slot is required")
})

type BulkSlotDefinitionSchemaType = z.infer<typeof BulkSlotDefinitionSchema>

interface SlotDefinitionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  zoneId: string
  slot?: SlotDefinition // For single slot edit mode
  isEdit?: boolean // Single slot edit
  isBulkEditMode?: boolean // Edit all slots at once
  existingSlots?: SlotDefinition[] // All existing slots for bulk edit
}

const SlotDefinitionModal = ({ 
  open, 
  onOpenChange, 
  onSuccess, 
  zoneId, 
  slot, 
  isEdit = false, 
  isBulkEditMode = false,
  existingSlots = []
}: SlotDefinitionModalProps) => {
  const { t } = useTranslation()
  const { mutateAsync: createBulkSlotDefinitions, isPending: isCreating } = useCreateBulkSlotDefinitions()
  const { mutateAsync: bulkUpdateSlotDefinitions, isPending: isUpdating } = useBulkUpdateSlotDefinitions()
  
  const [editedSlots, setEditedSlots] = useState<Set<number>>(new Set())
  
  // Track the number of existing slots to prevent their deletion
  const existingSlotsCount = isBulkEditMode ? existingSlots.length : 0

  // Set default values based on the mode
  const getDefaultValues = (): BulkSlotDefinitionSchemaType => {
    // Bulk edit mode: load all existing slots with their IDs
    if (isBulkEditMode && existingSlots.length > 0) {
      return {
        slots: existingSlots.map(s => ({
          id: s.id, // Include ID to track existing slots
          slot_key: s.slot_key || "",
          start_time: s.start_time || "",
          end_time: s.end_time || "",
          default_capacity: s.default_capacity || 1,
          is_active: s.is_active ?? true,
          cut_off_time: s.cut_off_time || "",
        }))
      }
    }
    
    // Single slot edit mode
    if (isEdit && slot) {
      return {
        slots: [{
          slot_key: slot.slot_key || "",
          start_time: slot.start_time || "",
          end_time: slot.end_time || "",
          default_capacity: slot.default_capacity || 1,
          is_active: slot.is_active ?? true,
          cut_off_time: slot.cut_off_time || "",
        }]
      }
    }

    // Create mode: start with one empty slot
    return {
      slots: [{
        slot_key: "",
        start_time: "",
        end_time: "",
        default_capacity: 1,
        is_active: true,
        cut_off_time: "",
      }]
    }
  }

  const form = useForm<BulkSlotDefinitionSchemaType>({
    defaultValues: getDefaultValues(),
    resolver: zodResolver(BulkSlotDefinitionSchema),
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "slots"
  })

  // Update form values when mode or data changes
  useEffect(() => {
    if (open) {
      const defaultValues = getDefaultValues()
      form.reset(defaultValues)
      setEditedSlots(new Set())
    }
  }, [slot, isEdit, isBulkEditMode, existingSlots, open])

  const isLoading = isCreating || isUpdating

  const handleSubmit = form.handleSubmit(
    async (values) => {
      try {
        // Only process slots that were actually edited
        const editedSlotsToProcess = values.slots.filter((_, index) => editedSlots.has(index))
        
        if (editedSlotsToProcess.length === 0) {
          toast.info("No changes detected")
          onOpenChange(false)
          return
        }

        // Separate edited slots into those to update (with IDs) and those to create (without IDs)
        const slotsToUpdate = editedSlotsToProcess.filter(s => s.id)
        const slotsToCreate = editedSlotsToProcess.filter(s => !s.id)
        
        // Bulk update existing slots in a single API call
        if (slotsToUpdate.length > 0) {
          await bulkUpdateSlotDefinitions({ zoneId, slots: slotsToUpdate })
        }

        // Bulk create new slots in a single API call
        if (slotsToCreate.length > 0) {
          await createBulkSlotDefinitions({
            zone_id: zoneId,
            slots: slotsToCreate.map(slot => ({ ...slot, metadata: {} }))
          })
        }

        toast.success(`${editedSlotsToProcess.length} slot definition(s) saved successfully`)

        form.reset()
        setEditedSlots(new Set())
        onOpenChange(false)
        onSuccess?.()
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : `Failed to ${isBulkEditMode ? 'save' : isEdit ? 'update' : 'create'} slot definition(s)`
        toast.error(errorMessage)
      }
    },
    () => {
      toast.error("Please fix the form errors before submitting")
    }
  )

  const handleClose = () => {
    form.reset()
    setEditedSlots(new Set())
    onOpenChange(false)
  }

  const addRow = () => {
    const newIndex = fields.length
    append({
      slot_key: "",
      start_time: "",
      end_time: "",
      default_capacity: 1,
      is_active: true,
      cut_off_time: "",
    })
    // Mark the new slot as edited
    setEditedSlots(prev => new Set(prev).add(newIndex))
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmit}>
        <FocusModal open={open} onOpenChange={handleClose}>
          <FocusModal.Content>
            <FocusModal.Header>
              <Heading level="h2">
                {isBulkEditMode ? "Edit Slot Definitions" : isEdit ? "Edit Slot Definition" : "Create Slot Definitions"}
              </Heading>
            </FocusModal.Header>
            
            <FocusModal.Body className="flex flex-1 flex-col overflow-y-auto">
              <div className="flex w-full flex-col gap-y-6 px-6 py-8">
                <div>
                  <Heading className="capitalize">
                    Slot Definitions
                  </Heading>
                  <Text size="small" className="text-ui-fg-subtle">
                    {isBulkEditMode 
                      ? "Edit existing delivery time slots and add new ones. Use the 'Active' toggle to enable/disable slots instead of deleting them." 
                      : isEdit 
                        ? "Edit the delivery time slot for this zone" 
                        : "Define delivery time slots for this zone. You can add multiple slots at once."}
                  </Text>
                </div>

                {/* Horizontal Table */}
                <div className="overflow-x-auto">
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
                        <th className="text-left py-2 px-2 text-ui-fg-subtle text-xs font-medium min-w-[100px]">
                          Capacity *
                        </th>
                        <th className="text-center py-2 px-2 text-ui-fg-subtle text-xs font-medium min-w-[80px]">
                          Active
                        </th>
                        {(!isEdit || isBulkEditMode) && (
                          <th className="text-center py-2 px-2 text-ui-fg-subtle text-xs font-medium w-[60px]">
                            Actions
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {fields.map((field, index) => (
                        <tr key={field.id} className="border-b border-ui-border-base">
                          <td className="py-2 px-2">
                            <Input
                              {...form.register(`slots.${index}.slot_key`)}
                              placeholder="morning-slot"
                              size="small"
                              onChange={(e) => {
                                form.register(`slots.${index}.slot_key`).onChange(e)
                                setEditedSlots(prev => new Set(prev).add(index))
                              }}
                            />
                            {form.formState.errors.slots?.[index]?.slot_key && (
                              <Text className="text-xs mt-1" style={{ color: '#ef4444' }}>
                                {form.formState.errors.slots[index]?.slot_key?.message}
                              </Text>
                            )}
                          </td>
                          <td className="py-2 px-2">
                            <Input
                              type="time"
                              {...form.register(`slots.${index}.start_time`)}
                              size="small"
                              onChange={(e) => {
                                form.register(`slots.${index}.start_time`).onChange(e)
                                setEditedSlots(prev => new Set(prev).add(index))
                              }}
                            />
                            {form.formState.errors.slots?.[index]?.start_time && (
                              <Text className="text-xs mt-1" style={{ color: '#ef4444' }}>
                                {form.formState.errors.slots[index]?.start_time?.message}
                              </Text>
                            )}
                          </td>
                          <td className="py-2 px-2">
                            <Input
                              type="time"
                              {...form.register(`slots.${index}.end_time`)}
                              size="small"
                              onChange={(e) => {
                                form.register(`slots.${index}.end_time`).onChange(e)
                                setEditedSlots(prev => new Set(prev).add(index))
                              }}
                            />
                            {form.formState.errors.slots?.[index]?.end_time && (
                              <Text className="text-xs mt-1" style={{ color: '#ef4444' }}>
                                {form.formState.errors.slots[index]?.end_time?.message}
                              </Text>
                            )}
                          </td>
                          <td className="py-2 px-2">
                            <Input
                              type="time"
                              {...form.register(`slots.${index}.cut_off_time`)}
                              size="small"
                              onChange={(e) => {
                                form.register(`slots.${index}.cut_off_time`).onChange(e)
                                setEditedSlots(prev => new Set(prev).add(index))
                              }}
                            />
                            {form.formState.errors.slots?.[index]?.cut_off_time && (
                              <Text className="text-xs mt-1" style={{ color: '#ef4444' }}>
                                {form.formState.errors.slots[index]?.cut_off_time?.message}
                              </Text>
                            )}
                          </td>
                          <td className="py-2 px-2">
                            <Input
                              type="number"
                              {...form.register(`slots.${index}.default_capacity`, { valueAsNumber: true })}
                              placeholder="10"
                              min="1"
                              size="small"
                              onChange={(e) => {
                                form.register(`slots.${index}.default_capacity`, { valueAsNumber: true }).onChange(e)
                                setEditedSlots(prev => new Set(prev).add(index))
                              }}
                            />
                            {form.formState.errors.slots?.[index]?.default_capacity && (
                              <Text className="text-xs mt-1" style={{ color: '#ef4444' }}>
                                {form.formState.errors.slots[index]?.default_capacity?.message}
                              </Text>
                            )}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <div className="flex justify-center">
                              <Switch
                                checked={form.watch(`slots.${index}.is_active`)}
                                onCheckedChange={(checked) => {
                                  form.setValue(`slots.${index}.is_active`, checked)
                                  setEditedSlots(prev => new Set(prev).add(index))
                                }}
                              />
                            </div>
                          </td>
                          {(!isEdit || isBulkEditMode) && (
                            <td className="py-2 px-2 text-center">
                              {isBulkEditMode && index < existingSlotsCount ? (
                                // Existing slots: show disabled delete button with tooltip
                                <IconButton
                                  type="button"
                                  variant="transparent"
                                  disabled
                                  title="Use 'Active' toggle to deactivate existing slots"
                                >
                                  <Trash className="text-ui-fg-disabled" />
                                </IconButton>
                              ) : (
                                // New slots or create mode: allow deletion
                                <IconButton
                                  type="button"
                                  variant="transparent"
                                  onClick={() => {
                                    remove(index)
                                    setEditedSlots(prev => new Set(prev).add(index))
                                  }}
                                  disabled={!isBulkEditMode && fields.length === 1}
                                  title="Delete this slot"
                                >
                                  <Trash className="text-ui-fg-subtle" />
                                </IconButton>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Add Row Button */}
                {(!isEdit || isBulkEditMode) && (
                  <div className="flex justify-start">
                    <Button
                      type="button"
                      variant="secondary"
                      size="small"
                      onClick={addRow}
                    >
                      <Plus className="mr-2" />
                      Add Slot
                    </Button>
                  </div>
                )}

                {/* General form errors */}
                {form.formState.errors.slots && typeof form.formState.errors.slots.message === 'string' && (
                  <Text className="text-small" style={{ color: '#ef4444' }}>
                    {form.formState.errors.slots.message}
                  </Text>
                )}
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
                  {t("actions.cancel")}
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
                      toast.error("Please fix the form errors before submitting")
                    }
                  }}
                >
                  {isBulkEditMode 
                    ? `Update ${fields.length} Slot${fields.length > 1 ? 's' : ''}` 
                    : isEdit 
                      ? "Update Slot Definition" 
                      : `Create ${fields.length} Slot${fields.length > 1 ? 's' : ''}`}
                </Button>
              </div>
            </FocusModal.Footer>
          </FocusModal.Content>
        </FocusModal>
      </form>
    </FormProvider>
  )
}

export default SlotDefinitionModal
