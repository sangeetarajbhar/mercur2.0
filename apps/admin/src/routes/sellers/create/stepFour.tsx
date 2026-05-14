import { Trash } from "@medusajs/icons"
import { Button, Heading, Input, Select, Text } from "@medusajs/ui"
import { useFieldArray } from "react-hook-form"
import { Form } from "./form"

export const StepFour = ({ form }: { form: any }) => {
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "company_spocs" })
  const allSpocs = form.watch("company_spocs") || []

  const getAvailableTypes = (currentIndex: number) => {
    const selectedTypes = allSpocs
      .map((spoc: any, idx: number) => (idx !== currentIndex ? spoc?.type : null))
      .filter(Boolean)
    return ["Primary", "Secondary"].filter((type) => !selectedTypes.includes(type))
  }

  const allTypesSelected = () => {
    const selectedTypes = allSpocs.map((spoc: any) => spoc?.type).filter(Boolean)
    return [...new Set(selectedTypes)].length >= 2
  }

  return (
    <div className="flex w-full flex-col items-center pb-12">
      <div className="flex w-full max-w-[720px] flex-col gap-y-8 px-2 py-16">
        <div>
          <Heading className="capitalize">Company SPOCs</Heading>
          <Text size="small" className="text-ui-fg-subtle">Add company single points of contact</Text>
        </div>
        {fields.map((field, index) => (
          <div key={field.id} className="border border-ui-border-base rounded-lg p-4 space-y-4">
            <div className="flex justify-between items-center mb-4">
              <Text size="small" weight="plus">SPOC {index + 1}</Text>
              {fields.length > 1 && (
                <Button variant="transparent" size="small" type="button" onClick={() => remove(index)}>
                  <Trash />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Form.Field control={form.control} name={`company_spocs.${index}.first_name`} render={({ field }) => (
                <Form.Item><Form.Label>First Name *</Form.Label><Form.Control><Input size="small" {...field} /></Form.Control><Form.ErrorMessage /></Form.Item>
              )} />
              <Form.Field control={form.control} name={`company_spocs.${index}.last_name`} render={({ field }) => (
                <Form.Item><Form.Label>Last Name *</Form.Label><Form.Control><Input size="small" {...field} /></Form.Control><Form.ErrorMessage /></Form.Item>
              )} />
              <Form.Field control={form.control} name={`company_spocs.${index}.email`} render={({ field }) => (
                <Form.Item><Form.Label>Email *</Form.Label><Form.Control><Input size="small" type="email" {...field} /></Form.Control><Form.ErrorMessage /></Form.Item>
              )} />
              <Form.Field control={form.control} name={`company_spocs.${index}.phone`} render={({ field }) => (
                <Form.Item><Form.Label>Phone *</Form.Label><Form.Control><Input size="small" type="tel" {...field} /></Form.Control><Form.ErrorMessage /></Form.Item>
              )} />
              <Form.Field control={form.control} name={`company_spocs.${index}.type`} render={({ field }) => {
                const availableTypes = getAvailableTypes(index)
                return (
                  <Form.Item>
                    <Form.Label>Type *</Form.Label>
                    <Form.Control>
                      <Select size="small" {...field} onValueChange={field.onChange} value={field.value || ""}>
                        <Select.Trigger><Select.Value placeholder="Select Type" /></Select.Trigger>
                        <Select.Content>
                          {availableTypes.length > 0 ? availableTypes.map((type) => (
                            <Select.Item key={type} value={type}>{type}</Select.Item>
                          )) : <Select.Item value="" disabled>All types already selected</Select.Item>}
                        </Select.Content>
                      </Select>
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )
              }} />
            </div>
          </div>
        ))}
        {!allTypesSelected() && (
          <Button
            type="button"
            variant="secondary"
            size="small"
            onClick={() => {
              const selectedTypes = allSpocs.map((spoc: any) => spoc?.type).filter(Boolean)
              const availableType = ["Primary", "Secondary"].find((type) => !selectedTypes.includes(type)) || "Primary"
              append({ first_name: "", last_name: "", email: "", phone: "", type: availableType })
            }}
          >
            Add SPOC
          </Button>
        )}
      </div>
    </div>
  )
}

