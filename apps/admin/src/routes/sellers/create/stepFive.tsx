import { Trash } from "@medusajs/icons"
import { Button, Heading, Input, Select, Text } from "@medusajs/ui"
import { useFieldArray } from "react-hook-form"
import { FileUploadButton } from "./fileUploadButton"
import { Form } from "./form"

const KYC_TYPES = [
  { label: "PAN", value: "PAN" },
  { label: "TAN", value: "TAN" },
  { label: "Noodle Letter", value: "NOODLE_LETTER" },
  { label: "Signature", value: "SIGNATURE" },
  { label: "COI", value: "COI" },
  { label: "Invoice Guideline", value: "INVOICE_GUIDELINE" },
  { label: "Cancelled Cheque", value: "CANCELLED_CHEQUE" },
  { label: "Agreement", value: "AGREEMENT" },
  { label: "Trademark", value: "TRADEMARK" },
  { label: "SIN Number", value: "SIN_NUMBER" },
  { label: "GST Certificate", value: "GST_CERTIFICATE" },
  { label: "MSME Certificate", value: "MSME_CERTIFICATE" },
  { label: "Others", value: "OTHERS" },
]

export const StepFive = ({ form }: { form: any }) => {
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "kyc_documents" })
  const sellerName = form.watch("name") || ""
  const allKycDocs = form.watch("kyc_documents") || []

  const getAvailableKycTypes = (currentIndex: number) => {
    const selectedTypes = allKycDocs
      .map((doc: any, idx: number) => (idx !== currentIndex ? doc?.kyc_type : null))
      .filter(Boolean)
    return KYC_TYPES.filter((type) => !selectedTypes.includes(type.value))
  }

  const allKycTypesSelected = () => {
    const selectedTypes = allKycDocs.map((doc: any) => doc?.kyc_type).filter(Boolean)
    return [...new Set(selectedTypes)].length >= KYC_TYPES.length
  }

  return (
    <div className="flex w-full flex-col items-center pb-12">
      <div className="flex w-full max-w-[720px] flex-col gap-y-8 px-2 py-16">
        <div>
          <Heading className="capitalize">KYC Documents</Heading>
          <Text size="small" className="text-ui-fg-subtle">Add KYC documents for the seller</Text>
        </div>
        {fields.map((field, index) => {
          const kycType = form.watch(`kyc_documents.${index}.kyc_type`)
          return (
            <div key={field.id} className="border border-ui-border-base rounded-lg p-4 space-y-4">
              <div className="flex justify-between items-center mb-4">
                <Text size="small" weight="plus">Document {index + 1}</Text>
                {fields.length > 1 && (
                  <Button variant="transparent" size="small" type="button" onClick={() => remove(index)}>
                    <Trash />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Form.Field control={form.control} name={`kyc_documents.${index}.kyc_type`} render={({ field }) => (
                  <Form.Item>
                    <Form.Label>KYC Type *</Form.Label>
                    <Form.Control>
                      <Select size="small" {...field} onValueChange={field.onChange} value={field.value || ""}>
                        <Select.Trigger><Select.Value placeholder="Select KYC Type" /></Select.Trigger>
                        <Select.Content>
                          {getAvailableKycTypes(index).length > 0 ? getAvailableKycTypes(index).map((type) => (
                            <Select.Item key={type.value} value={type.value}>{type.label}</Select.Item>
                          )) : <Select.Item value="" disabled>All types already selected</Select.Item>}
                        </Select.Content>
                      </Select>
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )} />
                <Form.Field control={form.control} name={`kyc_documents.${index}.value`} render={({ field }) => (
                  <Form.Item><Form.Label>Value *</Form.Label><Form.Control><Input size="small" {...field} /></Form.Control><Form.ErrorMessage /></Form.Item>
                )} />
                <Form.Field control={form.control} name={`kyc_documents.${index}.file_url`} render={({ field }) => (
                  <Form.Item className="col-span-2">
                    <Form.Label>File *</Form.Label>
                    <Form.Control>
                      <FileUploadButton
                        label="Upload Document"
                        accept="image/*,application/pdf"
                        currentUrl={field.value}
                        sellerName={sellerName}
                        docType={kycType}
                        uploadType="kyc"
                        onUploaded={(url) => field.onChange(url)}
                        onRemove={() => field.onChange("")}
                      />
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )} />
              </div>
            </div>
          )
        })}
        {!allKycTypesSelected() && (
          <Button
            type="button"
            variant="secondary"
            size="small"
            onClick={() => {
              const selectedTypes = allKycDocs.map((doc: any) => doc?.kyc_type).filter(Boolean)
              const availableType = KYC_TYPES.find((type) => !selectedTypes.includes(type.value))
              append({ kyc_type: availableType?.value || "", value: "", file_url: "" })
            }}
          >
            Add Document
          </Button>
        )}
      </div>
    </div>
  )
}

