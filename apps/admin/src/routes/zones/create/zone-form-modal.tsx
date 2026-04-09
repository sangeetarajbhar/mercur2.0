import { zodResolver } from "@hookform/resolvers/zod"
import { Button, toast, FocusModal, Input, Switch, Label, Textarea, Select, Heading, Text, Badge } from "@medusajs/ui"
import { FormProvider, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useEffect } from "react"
import { CreateZoneSchema, CreateZoneSchemaType } from "./scheme"
import { useCreateZone, useUpdateZone } from "../../../hooks/api/zones";
import { useDarkstoresFromExtensions } from "../../../hooks/api/stock-location-extensions";
import { Zone } from "../types"
import { POSTCODE_REGEX } from "../../../api/admin/zones/validators";

interface ZoneFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  zone?: Zone // For edit mode
  isEdit?: boolean
}

const ZoneFormModal = ({ open, onOpenChange, onSuccess, zone, isEdit = false }: ZoneFormModalProps) => {
  const { t } = useTranslation()

  // Set default values based on whether it's edit or create mode
  const getDefaultValues = (): CreateZoneSchemaType => {
    if (isEdit && zone) {
      return {
        name: zone.name || "",
        description: zone.description || "",
        postcodes: zone.postcodes || [],
        is_active: zone.is_active ?? true,
        location_id: zone.location_id || "",
      }
    }

    return {
      name: "",
      description: "",
      postcodes: [],
      is_active: true,
      location_id: "",
    }
  }

  const form = useForm<CreateZoneSchemaType & { postcodeInput?: string }>({
    defaultValues: getDefaultValues(),
    resolver: zodResolver(CreateZoneSchema),
  })

  // Update form values when zone data changes (for edit mode)
  useEffect(() => {
    if (isEdit && zone && open) {
      const defaultValues = getDefaultValues()
      form.reset(defaultValues)
    } else if (!isEdit && open) {
      form.reset(getDefaultValues())
    }
  }, [zone, isEdit, open, form])


  const { mutateAsync: createZone, isPending: isCreating } = useCreateZone()
  const { mutateAsync: updateZone, isPending: isUpdating } = useUpdateZone(zone?.id || "")
  const { data: darkstoresData, isLoading: locationsLoading } = useDarkstoresFromExtensions()
  
  

  const isLoading = isCreating || isUpdating


  const handleClose = () => {
    form.reset()
    onOpenChange(false)
  }

  return (
    <>
      <FormProvider {...form}>
        <form>
          <FocusModal open={open} onOpenChange={handleClose}>
            <FocusModal.Content>
              <FocusModal.Header>
                <Heading level="h2">{isEdit ? "Edit Zone" : "Create Zone"}</Heading>
              </FocusModal.Header>
              
              <FocusModal.Body className="flex flex-1 flex-col items-center overflow-y-auto">
                <div className="flex w-full max-w-[720px] flex-col gap-y-8 px-2 py-16">
                  {/* Zone Details Section */}
                  <div>
                    <Heading className="capitalize mb-2">
                      Zone Details
                    </Heading>
                    <Text size="small" className="text-ui-fg-muted">
                      Configure the basic zone information
                    </Text>
                  </div>

                  <div className="flex flex-col gap-y-6">
                    {/* Zone Name */}
                    <div className="flex flex-col gap-y-2">
                      <Label htmlFor="name" className="text-ui-fg-subtle text-small font-medium">
                        Zone Name *
                      </Label>
                      <Input
                        id="name"
                        {...form.register("name")}
                        placeholder="e.g., Mumbai"
                      />
                      {form.formState.errors.name && (
                        <Text className="text-small" style={{ color: '#ef4444' }}>
                          {form.formState.errors.name.message}
                        </Text>
                      )}
                    </div>

                    {/* Description */}
                    <div className="flex flex-col gap-y-2">
                      <Label htmlFor="description" className="text-ui-fg-subtle text-small font-medium">
                        Description
                      </Label>
                      <Textarea
                        id="description"
                        {...form.register("description")}
                        placeholder="Optional description for this zone"
                        rows={3}
                      />
                    </div>

                    {/* Location */}
                    <div className="flex flex-col gap-y-2">
                      <Label htmlFor="location_id" className="text-ui-fg-subtle text-small font-medium">
                        Location *
                      </Label>
                      <Select
                        value={form.watch("location_id")}
                        onValueChange={(value) => form.setValue("location_id", value)}
                        disabled={locationsLoading}
                      >
                        <Select.Trigger>
                          <Select.Value placeholder="Select a location" />
                        </Select.Trigger>
                        <Select.Content>
                          {locationsLoading ? (
                            <Select.Item value="loading" disabled>
                              Loading darkstores...
                            </Select.Item>
                          ) : (darkstoresData?.darkstores?.length || 0) === 0 ? (
                            <Select.Item value="no-locations" disabled>
                              No darkstores available
                            </Select.Item>
                          ) : (
                            (darkstoresData?.darkstores || []).map((ds: { id: string; name: string }) => (
                              <Select.Item key={ds.id} value={ds.id}>
                                {ds.name}
                              </Select.Item>
                            ))
                          )}
                        </Select.Content>
                      </Select>
                      {form.formState.errors.location_id && (
                        <Text className="text-small" style={{ color: '#ef4444' }}>
                          {form.formState.errors.location_id.message}
                        </Text>
                      )}
                    </div>

                    {/* Postcodes */}
                    <div className="flex flex-col gap-y-2">
                      <Label className="text-ui-fg-subtle text-small font-medium">
                        Postcodes *
                      </Label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {form.watch("postcodes").map((postcode, index) => (
                          <Badge key={index} className="flex items-center gap-1">
                            {postcode}
                            <button
                              type="button"
                              onClick={() => {
                                const newPostcodes = form.getValues("postcodes").filter((_, i) => i !== index)
                                form.setValue("postcodes", newPostcodes)
                              }}
                              className="ml-1 text-ui-fg-muted hover:text-ui-fg-subtle"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter 6-digit postcode"
                          value={form.watch("postcodeInput") || ""}
                          onChange={(e) => form.setValue("postcodeInput", e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              const postcode = form.getValues("postcodeInput")?.trim()
                              if (postcode && POSTCODE_REGEX.test(postcode)) {
                                const currentPostcodes = form.getValues("postcodes")
                                if (!currentPostcodes.includes(postcode)) {
                                  form.setValue("postcodes", [...currentPostcodes, postcode])
                                  form.setValue("postcodeInput", "")
                                }
                              }
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => {
                            const postcode = form.getValues("postcodeInput")?.trim()
                            if (postcode && POSTCODE_REGEX.test(postcode)) {
                              const currentPostcodes = form.getValues("postcodes")
                              if (!currentPostcodes.includes(postcode)) {
                                form.setValue("postcodes", [...currentPostcodes, postcode])
                                form.setValue("postcodeInput", "")
                              }
                            }
                          }}
                        >
                          Add
                        </Button>
                      </div>
                      {form.formState.errors.postcodes && (
                        <Text className="text-small" style={{ color: '#ef4444' }}>
                          {form.formState.errors.postcodes.message}
                        </Text>
                      )}
                    </div>

                    {/* Active Status */}
                    <div className="flex items-center gap-x-2">
                      <Switch
                        id="is_active"
                        checked={form.watch("is_active")}
                        onCheckedChange={(checked) => form.setValue("is_active", checked)}
                      />
                      <Label htmlFor="is_active" className="text-ui-fg-subtle text-small font-medium">
                        Active Zone
                      </Label>
                    </div>
                  </div>

                </div>
              </FocusModal.Body>

              <FocusModal.Footer>
                <div className="flex items-center justify-end gap-x-2">
                  <Button 
                    variant="secondary" 
                    size="small" 
                    onClick={handleClose}
                    disabled={isLoading}
                  >
                    {t("actions.cancel")}
                  </Button>
                  <Button
                    size="small"
                    type="button"
                    isLoading={isLoading}
                    onClick={async () => {
                      const isValid = await form.trigger()
                      
                      if (isValid) {
                        const values = form.getValues()
                            // Remove postcodeInput from submission as it's only for UI
                            // eslint-disable-next-line @typescript-eslint/no-unused-vars
                            const { postcodeInput, ...submitValues } = values as CreateZoneSchemaType & { postcodeInput?: string }
                        
                        try {
                          if (isEdit && zone) {
                            await updateZone(submitValues)
                            toast.success("Zone updated successfully")
                          } else {
                            await createZone(submitValues)
                            toast.success("Zone created successfully")
                          }
                          
                          form.reset()
                          onOpenChange(false)
                          onSuccess?.()
                        } catch (err) {
                          const message = (err as Error)?.message || `Failed to ${isEdit ? 'update' : 'create'} zone`
                          toast.error(message)
                        }
                      } else {
                        toast.error("Please fix the form errors before submitting")
                      }
                    }}
                  >
                    {isEdit ? "Update Zone" : "Create Zone"}
                  </Button>
                </div>
              </FocusModal.Footer>
            </FocusModal.Content>
          </FocusModal>
        </form>
      </FormProvider>

    </>
  )
}

export default ZoneFormModal