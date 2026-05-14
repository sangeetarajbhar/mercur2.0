import { Heading, Input, Text } from "@medusajs/ui"
import { FileUploadButton } from "./fileUploadButton"
import { Form } from "./form"

export const StepThree = ({ form, isEditMode = false }: { form: any; isEditMode?: boolean }) => {
  const sellerName = form.watch("name") || ""

  return (
    <div className="flex w-full flex-col items-center pb-12">
      <div className="flex w-full max-w-[720px] flex-col gap-y-8 px-2 py-16">
        <div>
          <Heading className="capitalize">Member Information</Heading>
          <Text size="small" className="text-ui-fg-subtle">Enter the primary member details for the seller</Text>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Form.Field control={form.control} name="member.name" render={({ field }) => (
            <Form.Item><Form.Label>Name *</Form.Label><Form.Control><Input size="small" {...field} /></Form.Control><Form.ErrorMessage /></Form.Item>
          )} />
          <Form.Field control={form.control} name="member.email" render={({ field }) => (
            <Form.Item>
              <Form.Label>Email *</Form.Label>
              <Form.Control><Input size="small" type="email" {...field} disabled={isEditMode} /></Form.Control>
              <Form.ErrorMessage />
            </Form.Item>
          )} />
          <Form.Field control={form.control} name="member.phone" render={({ field }) => (
            <Form.Item><Form.Label>Phone *</Form.Label><Form.Control><Input size="small" type="tel" {...field} /></Form.Control><Form.ErrorMessage /></Form.Item>
          )} />
          <Form.Field control={form.control} name="member.bio" render={({ field }) => (
            <Form.Item><Form.Label>Bio *</Form.Label><Form.Control><Input size="small" {...field} /></Form.Control><Form.ErrorMessage /></Form.Item>
          )} />
          <Form.Field control={form.control} name="member.photo" render={({ field }) => (
            <Form.Item className="col-span-2">
              <Form.Label>Photo</Form.Label>
              <Form.Control>
                <FileUploadButton
                  label="Upload Photo"
                  accept="image/*"
                  currentUrl={field.value}
                  sellerName={sellerName}
                  uploadType="member"
                  onUploaded={(url) => field.onChange(url)}
                  onRemove={() => field.onChange(null)}
                />
              </Form.Control>
              <Form.ErrorMessage />
            </Form.Item>
          )} />
        </div>
      </div>
    </div>
  )
}

