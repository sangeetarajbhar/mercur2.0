import { zodResolver } from "@hookform/resolvers/zod"
import { 
  Button, 
  toast, 
  FocusModal, 
  Input, 
  Switch, 
  Heading,
  Text,
  Label
} from "@medusajs/ui"
import { FormProvider, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useEffect } from "react"
import { z } from "zod"
import { InstantPromise, useCreateInstantPromise, useUpdateInstantPromise } from "../../../hooks/api/instant-promises"

const PROMISE_TEXT_PLACEHOLDER = "{{PROMISE_MINUTES}}"

const InstantPromiseSchema = z.object({
  promise_text: z.string().min(1, "Promise text is required"),
  promise_minutes: z.number().min(1, "Promise minutes must be at least 1").default(30),
  pickup_lead_minutes: z.number().min(0, "Pickup lead minutes must be non-negative").default(0),
  return_lead_minutes: z.number().min(0, "Return lead minutes must be non-negative").default(0),
  is_active: z.boolean().default(true),
})

type InstantPromiseSchemaType = z.infer<typeof InstantPromiseSchema>

interface InstantPromiseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  zoneId: string
  promise?: InstantPromise // For edit mode
  isEdit?: boolean
}

const InstantPromiseModal = ({ open, onOpenChange, onSuccess, zoneId, promise, isEdit = false }: InstantPromiseModalProps) => {
  
  const { t } = useTranslation()
  const { mutateAsync: createInstantPromise, isPending: isCreating } = useCreateInstantPromise()
  const { mutateAsync: updateInstantPromise, isPending: isUpdating } = useUpdateInstantPromise(zoneId, promise?.id || "")
  
  // Set default values based on whether it's edit or create mode
  const getDefaultValues = (): InstantPromiseSchemaType => {
    if (isEdit && promise) {
      return {
        promise_text: promise.promise_text || "",
        promise_minutes: promise.promise_minutes || 30,
        pickup_lead_minutes: promise.pickup_lead_minutes || 0,
        return_lead_minutes: promise.return_lead_minutes || 0,
        is_active: promise.is_active ?? true,
      }
    }

    return {
      promise_text: "",
      promise_minutes: 30,
      pickup_lead_minutes: 0,
      return_lead_minutes: 0,
      is_active: true,
    }
  }

  const form = useForm<InstantPromiseSchemaType>({
    defaultValues: getDefaultValues(),
    resolver: zodResolver(InstantPromiseSchema),
  })

  // Update form values when promise data changes (for edit mode)
  useEffect(() => {
    if (isEdit && promise && open) {
      const defaultValues = getDefaultValues()
      form.reset(defaultValues)
    } else if (!isEdit && open) {
      form.reset(getDefaultValues())
    }
  }, [promise, isEdit, open, form])

  const isLoading = isCreating || isUpdating

  const handleSubmit = form.handleSubmit(
    async (values) => {
      try {
        if (isEdit && promise) {
          await updateInstantPromise(values)
          toast.success("Instant promise updated successfully")
        } else {
          await createInstantPromise({ ...values, zone_id: zoneId })
          toast.success("Instant promise created successfully")
        }
        
        form.reset()
        onOpenChange(false)
        onSuccess?.()
      } catch {
        toast.error(`Failed to ${isEdit ? 'update' : 'create'} instant promise`)
      }
    },
    () => {
      toast.error("Please fix the form errors before submitting")
    }
  )


  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmit}>
        <FocusModal open={open} onOpenChange={onOpenChange}>
          <FocusModal.Content>
            <FocusModal.Header>
              <Heading level="h2">{isEdit ? "Edit Promise" : "Create Promise"}</Heading>
            </FocusModal.Header>
            
            <FocusModal.Body className="flex flex-1 flex-col items-center overflow-y-auto">
              <div className="flex w-full max-w-[720px] flex-col gap-y-8 px-2 py-16">
                <div>
                  <Heading className="capitalize">
                    Promise Settings
                  </Heading>
                  <Text size="small" className="text-ui-fg-muted">
                    Configure the delivery promise for this zone
                  </Text>
                </div>

                <div className="flex flex-col gap-y-6">
                  {/* Promise Text */}
                  <div className="flex flex-col gap-y-2">
                    <Label htmlFor="promise_text" className="text-ui-fg-subtle text-small font-medium">
                      Promise Text *
                    </Label>
                    <Input
                      id="promise_text"
                      {...form.register("promise_text")}
                      placeholder={`e.g., Delivered within ${PROMISE_TEXT_PLACEHOLDER} mins`}
                    />
                    <Text size="xsmall" className="text-ui-fg-muted">
                      Use the placeholder <Text as="span" weight="plus" className="font-mono bg-ui-bg-base px-1 rounded">{PROMISE_TEXT_PLACEHOLDER}</Text> to automatically inject the calculated promise minutes.
                    </Text>
                    {form.formState.errors.promise_text && (
                      <Text className="text-small" style={{ color: '#ef4444' }}>
                        {form.formState.errors.promise_text.message}
                      </Text>
                    )}
                  </div>

                  {/* Promise Minutes */}
                  <div className="flex flex-col gap-y-2">
                    <Label htmlFor="promise_minutes" className="text-ui-fg-subtle text-small font-medium">
                      Promise Minutes *
                    </Label>
                    <Input
                      id="promise_minutes"
                      type="number"
                      {...form.register("promise_minutes", { valueAsNumber: true })}
                      placeholder="30"
                      min="1"
                    />
                    {form.formState.errors.promise_minutes && (
                      <Text className="text-small" style={{ color: '#ef4444' }}>
                        {form.formState.errors.promise_minutes.message}
                      </Text>
                    )}
                  </div>

                  {/* Pickup Lead Minutes */}
                  <div className="flex flex-col gap-y-2">
                    <Label htmlFor="pickup_lead_minutes" className="text-ui-fg-subtle text-small font-medium">
                      Pickup Lead Minutes
                    </Label>
                    <Input
                      id="pickup_lead_minutes"
                      type="number"
                      {...form.register("pickup_lead_minutes", { valueAsNumber: true })}
                      placeholder="0"
                      min="0"
                    />
                    {form.formState.errors.pickup_lead_minutes && (
                      <Text className="text-small" style={{ color: '#ef4444' }}>
                        {form.formState.errors.pickup_lead_minutes.message}
                      </Text>
                    )}
                  </div>

                  {/* Return Lead Minutes */}
                  <div className="flex flex-col gap-y-2">
                    <Label htmlFor="return_lead_minutes" className="text-ui-fg-subtle text-small font-medium">
                      Return Lead Minutes
                    </Label>
                    <Input
                      id="return_lead_minutes"
                      type="number"
                      {...form.register("return_lead_minutes", { valueAsNumber: true })}
                      placeholder="0"
                      min="0"
                    />
                    {form.formState.errors.return_lead_minutes && (
                      <Text className="text-small" style={{ color: '#ef4444' }}>
                        {form.formState.errors.return_lead_minutes.message}
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
                      Active Promise
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
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                >
                  {t("actions.cancel")}
                </Button>
                <Button
                  size="small"
                  type="submit"
                  isLoading={isLoading}
                  onClick={(e) => {
                    e.preventDefault();
                    handleSubmit();
                  }}
                >
                  {isEdit ? "Update Promise" : "Create Promise"}
                </Button>
              </div>
            </FocusModal.Footer>
          </FocusModal.Content>
        </FocusModal>
      </form>
    </FormProvider>
  )
}

export default InstantPromiseModal
