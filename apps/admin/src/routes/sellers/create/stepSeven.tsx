import { Checkbox, Heading, Input, Select, Text } from "@medusajs/ui"
import { Form } from "./form"

export const StepSeven = ({ form }: { form: any }) => {
  return (
    <div className="flex w-full flex-col items-center pb-12">
      <div className="flex w-full max-w-[720px] flex-col gap-y-8 px-2 py-16">
        <div>
          <Heading className="capitalize">Bank Details</Heading>
          <Text size="small" className="text-ui-fg-subtle">Enter the bank account information</Text>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Form.Field control={form.control} name="bank_detail.account_number" render={({ field }) => (
            <Form.Item><Form.Label>Account Number *</Form.Label><Form.Control><Input size="small" {...field} /></Form.Control><Form.ErrorMessage /></Form.Item>
          )} />
          <Form.Field control={form.control} name="bank_detail.ifsc_code" render={({ field }) => (
            <Form.Item><Form.Label>IFSC Code *</Form.Label><Form.Control><Input size="small" {...field} /></Form.Control><Form.ErrorMessage /></Form.Item>
          )} />
          <Form.Field control={form.control} name="bank_detail.bank_name" render={({ field }) => (
            <Form.Item><Form.Label>Bank Name *</Form.Label><Form.Control><Input size="small" {...field} /></Form.Control><Form.ErrorMessage /></Form.Item>
          )} />
          <Form.Field control={form.control} name="bank_detail.branch_name" render={({ field }) => (
            <Form.Item><Form.Label>Branch Name *</Form.Label><Form.Control><Input size="small" {...field} /></Form.Control><Form.ErrorMessage /></Form.Item>
          )} />
          <Form.Field control={form.control} name="bank_detail.account_type" render={({ field }) => (
            <Form.Item>
              <Form.Label>Account Type *</Form.Label>
              <Form.Control>
                <Select size="small" {...field} onValueChange={field.onChange} value={field.value || ""}>
                  <Select.Trigger><Select.Value placeholder="Select Account Type" /></Select.Trigger>
                  <Select.Content>
                    <Select.Item value="SAVINGS">Savings</Select.Item>
                    <Select.Item value="CURRENT">Current</Select.Item>
                  </Select.Content>
                </Select>
              </Form.Control>
              <Form.ErrorMessage />
            </Form.Item>
          )} />
          <Form.Field control={form.control} name="bank_detail.entity_type" render={({ field }) => (
            <Form.Item>
              <Form.Label>Entity Type *</Form.Label>
              <Form.Control>
                <Select size="small" {...field} onValueChange={field.onChange} value={field.value || ""}>
                  <Select.Trigger><Select.Value placeholder="Select Entity Type" /></Select.Trigger>
                  <Select.Content>
                    <Select.Item value="PRIVATE_LIMITED">Private Limited</Select.Item>
                    <Select.Item value="PARTNERSHIP">Partnership</Select.Item>
                    <Select.Item value="PROPRIETORSHIP">Proprietorship</Select.Item>
                  </Select.Content>
                </Select>
              </Form.Control>
              <Form.ErrorMessage />
            </Form.Item>
          )} />
          <Form.Field control={form.control} name="bank_detail.account_verified" render={({ field }) => (
            <Form.Item>
              <div className="flex items-center gap-2">
                <Form.Control><Checkbox checked={field.value} onCheckedChange={field.onChange} /></Form.Control>
                <Form.Label>Account Verified</Form.Label>
              </div>
              <Form.ErrorMessage />
            </Form.Item>
          )} />
        </div>
      </div>
    </div>
  )
}

