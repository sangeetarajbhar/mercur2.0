import { Heading, Text } from "@medusajs/ui"
import { useMemo } from "react"
import { BrandMultiSelect } from "./brandMultiSelect"
import { Form } from "./form"

export const StepSix = ({ form }: { form: any }) => {
  const brandAssociations = form.watch("brand_associations") || []
  const selectedBrandIds = brandAssociations.map((ba: any) => ba.brand_id).filter(Boolean) || []

  const preloadedBrands = useMemo(() => {
    return brandAssociations
      .map((ba: any) => {
        if (!ba.brand_id) return null
        return { id: ba.brand_id, name: ba.name, handle: ba.handle }
      })
      .filter(Boolean) as Array<{ id: string; name: string; handle?: string }>
  }, [brandAssociations])

  const handleBrandSelectionChange = (brandIds: string[]) => {
    form.setValue(
      "brand_associations",
      brandIds.map((brandId) => ({ brand_id: brandId })),
      { shouldValidate: true }
    )
  }

  return (
    <div className="flex w-full flex-col items-center pb-12">
      <div className="flex w-full max-w-[720px] flex-col gap-y-8 px-2 py-16">
        <div>
          <Heading className="capitalize">Brand Associations</Heading>
          <Text size="small" className="text-ui-fg-subtle">Select multiple brands to associate with this seller</Text>
        </div>
        <Form.Field
          control={form.control}
          name="brand_associations"
          render={() => (
            <Form.Item>
              <Form.Label>Brand Associations *</Form.Label>
              <Form.Control>
                <BrandMultiSelect
                  selectedBrandIds={selectedBrandIds}
                  onSelectionChange={handleBrandSelectionChange}
                  preloadedBrands={preloadedBrands}
                />
              </Form.Control>
              <Form.ErrorMessage />
            </Form.Item>
          )}
        />
      </div>
    </div>
  )
}

