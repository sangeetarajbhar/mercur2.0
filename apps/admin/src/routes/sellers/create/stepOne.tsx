import { Heading, Input, Select, Switch, Text } from "@medusajs/ui"
import { useMemo } from "react"
import { useWatch } from "react-hook-form"
import { getCountrySelectOptions } from "./sellerFormDefaults"
import { Form } from "./form"

export const StepOne = ({ form }: { form: any }) => {
  const countryCode = useWatch({ control: form.control, name: "country_code" })
  const countryOptions = useMemo(() => getCountrySelectOptions(countryCode), [countryCode])
  return (
    <div className="flex w-full flex-col items-center pb-12">
      <div className="flex w-full max-w-[720px] flex-col gap-y-8 px-2 py-8 sm:py-12">
        <div>
          <Heading className="capitalize">General & Contact Information</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Enter the basic and contact information about the seller
          </Text>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Form.Field control={form.control} name="name" render={({ field }) => (
            <Form.Item>
              <Form.Label>Name *</Form.Label>
              <Form.Control><Input size="small" {...field} /></Form.Control>
              <Form.ErrorMessage />
            </Form.Item>
          )} />
          <Form.Field control={form.control} name="display_name" render={({ field }) => (
            <Form.Item>
              <Form.Label>Display Name *</Form.Label>
              <Form.Control><Input size="small" {...field} /></Form.Control>
              <Form.ErrorMessage />
            </Form.Item>
          )} />
          <Form.Field control={form.control} name="entity_type" render={({ field }) => (
            <Form.Item>
              <Form.Label>Entity Type *</Form.Label>
              <Form.Control>
                <Select size="small" {...field} value={field.value || ""} onValueChange={field.onChange}>
                  <Select.Trigger><Select.Value placeholder="Select Entity Type" /></Select.Trigger>
                  <Select.Content className="!max-h-[min(280px,55vh)] !overflow-y-auto" collisionPadding={24}>
                    <Select.Item value="PRIVATE_LIMITED">Private Limited</Select.Item>
                    <Select.Item value="PARTNERSHIP">Partnership</Select.Item>
                    <Select.Item value="PROPRIETORSHIP">Proprietorship</Select.Item>
                  </Select.Content>
                </Select>
              </Form.Control>
              <Form.ErrorMessage />
            </Form.Item>
          )} />
          <Form.Field control={form.control} name="seller_type" render={({ field }) => (
            <Form.Item>
              <Form.Label>Seller Type *</Form.Label>
              <Form.Control>
                <Select size="small" {...field} value={field.value || ""} onValueChange={field.onChange}>
                  <Select.Trigger><Select.Value placeholder="Select Seller Type" /></Select.Trigger>
                  <Select.Content className="!max-h-[min(280px,55vh)] !overflow-y-auto" collisionPadding={24}>
                    <Select.Item value="BRAND">Brand</Select.Item>
                    <Select.Item value="SELLER">Seller</Select.Item>
                    <Select.Item value="DISTRIBUTOR">Distributor</Select.Item>
                  </Select.Content>
                </Select>
              </Form.Control>
              <Form.ErrorMessage />
            </Form.Item>
          )} />
          <Form.Field control={form.control} name="msme" render={({ field }) => (
            <Form.Item>
              <div className="flex items-center gap-2">
                <Form.Control><Switch checked={field.value} onCheckedChange={field.onChange} /></Form.Control>
                <Form.Label>MSME</Form.Label>
              </div>
              <Form.ErrorMessage />
            </Form.Item>
          )} />
          <Form.Field control={form.control} name="email" render={({ field }) => (
            <Form.Item>
              <Form.Label>Email *</Form.Label>
              <Form.Control><Input size="small" type="email" {...field} /></Form.Control>
              <Form.ErrorMessage />
            </Form.Item>
          )} />
          <Form.Field control={form.control} name="phone" render={({ field }) => (
            <Form.Item>
              <Form.Label>Phone *</Form.Label>
              <Form.Control><Input size="small" type="tel" {...field} /></Form.Control>
              <Form.ErrorMessage />
            </Form.Item>
          )} />
          <Form.Field control={form.control} name="address_line" render={({ field }) => (
            <Form.Item>
              <Form.Label>Address Line *</Form.Label>
              <Form.Control><Input size="small" {...field} /></Form.Control>
              <Form.ErrorMessage />
            </Form.Item>
          )} />
          <Form.Field control={form.control} name="city" render={({ field }) => (
            <Form.Item>
              <Form.Label>City *</Form.Label>
              <Form.Control><Input size="small" {...field} /></Form.Control>
              <Form.ErrorMessage />
            </Form.Item>
          )} />
          <Form.Field control={form.control} name="state" render={({ field }) => (
            <Form.Item>
              <Form.Label>State *</Form.Label>
              <Form.Control><Input size="small" {...field} /></Form.Control>
              <Form.ErrorMessage />
            </Form.Item>
          )} />
          <Form.Field control={form.control} name="postal_code" render={({ field }) => (
            <Form.Item>
              <Form.Label>Postal Code *</Form.Label>
              <Form.Control><Input size="small" {...field} /></Form.Control>
              <Form.ErrorMessage />
            </Form.Item>
          )} />
          <Form.Field control={form.control} name="tax_id" render={({ field }) => (
            <Form.Item>
              <Form.Label>Tax ID *</Form.Label>
              <Form.Control><Input size="small" {...field} /></Form.Control>
              <Form.ErrorMessage />
            </Form.Item>
          )} />
          <Form.Field control={form.control} name="country_code" render={({ field }) => (
            <Form.Item className="col-span-2">
              <Form.Label>Country *</Form.Label>
              <Form.Control>
                {/*
                  Medusa/Radix Select forces max-h-[200px], overflow-hidden, and a short viewport —
                  long country lists clip and cannot scroll inside modals. Native <select> uses the
                  OS list (scrollable, not clipped by parent overflow).
                */}
                <select
                  className="txt-compact-small text-ui-fg-base shadow-buttons-neutral bg-ui-bg-field hover:bg-ui-bg-field-hover flex h-7 w-full cursor-pointer rounded-md px-2 outline-none transition-fg focus-visible:shadow-borders-interactive-with-active"
                  value={(field.value || "").toLowerCase()}
                  onChange={(e) => field.onChange(e.target.value)}
                  aria-label="Country"
                >
                  <option value="">Select country</option>
                  {countryOptions.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </Form.Control>
              <Form.ErrorMessage />
            </Form.Item>
          )} />
        </div>
        <Form.Field control={form.control} name="description" render={({ field }) => (
          <Form.Item>
            <Form.Label>Description *</Form.Label>
            <Form.Control><Input size="small" {...field} /></Form.Control>
            <Form.ErrorMessage />
          </Form.Item>
        )} />
      </div>
    </div>
  )
}

