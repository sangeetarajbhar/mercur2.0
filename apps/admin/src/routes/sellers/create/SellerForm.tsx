import { zodResolver } from "@hookform/resolvers/zod"
import { Button, FocusModal, ProgressStatus, ProgressTabs, toast } from "@medusajs/ui"
import { useEffect, useState, type FormEvent } from "react"
import { FormProvider, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { useCreateSeller, useUpdateSellerOnboarding } from "../../../hooks/api/sellers"
import type { z } from "zod"
import {
  BrandAssociationsSchema,
  CompanySpocsSchema,
  ContactInfoSchema,
  CreateSellerSchema,
  CreateSellerSchemaType,
  GeneralInfoSchema,
  KycDocumentsSchema,
  MemberInfoSchema,
} from "./schema"
import { StepFive } from "./stepFive"
import { StepFour } from "./stepFour"
import { StepOne } from "./stepOne"
import { StepSeven } from "./stepSeven"
import { StepSix } from "./stepSix"
import { StepThree } from "./stepThree"
import { createEmptySellerForm, sellerApiToFormValues } from "./sellerFormDefaults"

enum Tab {
  STEP_ONE = "step1",
  STEP_TWO = "step2",
  STEP_THREE = "step3",
  STEP_FOUR = "step4",
  STEP_FIVE = "step5",
  STEP_SIX = "step6",
}

type SellerFormProps = {
  sellerId?: string
  sellerData?: any
  onClose?: () => void
  open?: boolean
}

export const SellerForm = ({ sellerId, sellerData, onClose, open = true }: SellerFormProps) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<Tab>(Tab.STEP_ONE)
  const [validSteps, setValidSteps] = useState({
    step1: false,
    step2: false,
    step3: false,
    step4: false,
    step5: false,
  })

  const isEditMode = !!sellerId
  const form = useForm<CreateSellerSchemaType>({
    defaultValues:
      sellerId && sellerData ? sellerApiToFormValues(sellerData) : createEmptySellerForm(),
    resolver: zodResolver(CreateSellerSchema),
    mode: "onChange",
  })

  useEffect(() => {
    if (!sellerId || !sellerData) return
    form.reset(sellerApiToFormValues(sellerData))
  }, [sellerId, sellerData])

  const { mutateAsync: createSeller, isPending: isCreating } = useCreateSeller()
  const { mutateAsync: updateSeller, isPending: isUpdating } = useUpdateSellerOnboarding()
  const isLoading = isCreating || isUpdating

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      const companySpocs = values.company_spocs.filter((spoc) => spoc.first_name && spoc.last_name && spoc.email && spoc.phone)
      const kycDocuments = values.kyc_documents.filter((doc) => doc.kyc_type && doc.value)

      if (isEditMode && sellerId) {
        const currentBrandIds = sellerData?.brand_associations?.map((ba: any) => ba.brand_id || ba.id) || []
        const newBrandIds = values.brand_associations?.map((ba: any) => ba.brand_id) || []
        const brandsToAdd = newBrandIds.filter((id: string) => !currentBrandIds.includes(id))
        const brandsToRemove = currentBrandIds.filter((id: string) => !newBrandIds.includes(id))
        const { email, ...memberWithoutEmail } = values.member || {}

        await updateSeller({
          id: sellerId,
          data: {
            ...values,
            member: memberWithoutEmail,
            company_spocs: companySpocs,
            kyc_documents: kycDocuments,
            brand_associations: {
              update: brandsToAdd.map((brand_id: string) => ({ brand_id })),
              delete: brandsToRemove,
            },
          },
        })
        toast.success("Seller updated successfully")
        if (onClose) onClose()
        else navigate(`/sellers/${sellerId}`)
      } else {
        await createSeller({
          ...values,
          company_spocs: companySpocs,
          kyc_documents: kycDocuments,
        })
        toast.success("Seller created successfully")
        if (onClose) onClose()
        else navigate("/sellers")
      }
    } catch (error: any) {
      toast.error(error.message || `Failed to ${isEditMode ? "update" : "create"} seller`)
    }
  })

  const forwardStepSchemas: Partial<Record<Tab, z.ZodTypeAny>> = {
    [Tab.STEP_ONE]: GeneralInfoSchema.merge(ContactInfoSchema),
    [Tab.STEP_TWO]: MemberInfoSchema,
    [Tab.STEP_THREE]: CompanySpocsSchema,
    [Tab.STEP_FOUR]: KycDocumentsSchema,
    [Tab.STEP_FIVE]: BrandAssociationsSchema,
  }

  const onTabChange = (tab: Tab) => {
    const tabs = [Tab.STEP_ONE, Tab.STEP_TWO, Tab.STEP_THREE, Tab.STEP_FOUR, Tab.STEP_FIVE, Tab.STEP_SIX]
    const currentIndex = tabs.indexOf(activeTab)
    const targetIndex = tabs.indexOf(tab)
    if (targetIndex > currentIndex) {
      const schema = forwardStepSchemas[activeTab]
      if (schema) {
        const result = schema.safeParse(form.getValues())
        if (!result.success) {
          result.error.errors.forEach((error) => {
            const path = error.path.join(".") as any
            form.setError(path, { message: error.message, type: "manual" })
          })
          return
        }
        setValidSteps((prev) => ({ ...prev, [activeTab]: true }))
      }
    }
    setActiveTab(tab)
  }

  const handleClose = () => {
    if (onClose) onClose()
    else navigate("/sellers")
  }

  const getNextTab = () => {
    const tabs = [Tab.STEP_ONE, Tab.STEP_TWO, Tab.STEP_THREE, Tab.STEP_FOUR, Tab.STEP_FIVE, Tab.STEP_SIX]
    const currentIndex = tabs.indexOf(activeTab)
    return currentIndex < tabs.length - 1 ? tabs[currentIndex + 1] : activeTab
  }

  const status = (step: keyof typeof validSteps, tab: Tab): ProgressStatus =>
    validSteps[step] ? "completed" : activeTab === tab ? "in-progress" : "not-started"

  const isLastStep = activeTab === Tab.STEP_SIX

  /** Only the Bank step should submit the form (Enter in inputs, or button-type quirks). */
  const onFormSubmit = (e: FormEvent<HTMLFormElement>) => {
    if (activeTab !== Tab.STEP_SIX) {
      e.preventDefault()
      e.stopPropagation()
      return
    }
    void handleSubmit(e)
  }

  return (
    <FormProvider {...form}>
      <form id="seller-form" onSubmit={onFormSubmit}>
        <FocusModal open={open} onOpenChange={handleClose}>
          <FocusModal.Content className="flex max-h-[min(920px,calc(100vh-1.5rem))] w-full max-w-[min(960px,100vw-1rem)] flex-col">
            <ProgressTabs
              value={activeTab}
              className="flex min-h-0 min-w-0 flex-1 flex-col"
              onValueChange={(tab) => onTabChange(tab as Tab)}
            >
              <FocusModal.Header className="shrink-0 border-b border-ui-border-base">
                <ProgressTabs.List className="border-ui-border-base -my-2 ml-2 min-w-0 flex-1 border-l overflow-x-auto">
                  <ProgressTabs.Trigger value={Tab.STEP_ONE} status={status("step1", Tab.STEP_ONE)} className="w-full max-w-[150px]">General & Contact</ProgressTabs.Trigger>
                  <ProgressTabs.Trigger value={Tab.STEP_TWO} status={status("step2", Tab.STEP_TWO)} className="w-full max-w-[150px]">Member</ProgressTabs.Trigger>
                  <ProgressTabs.Trigger value={Tab.STEP_THREE} status={status("step3", Tab.STEP_THREE)} className="w-full max-w-[150px]">SPOCs</ProgressTabs.Trigger>
                  <ProgressTabs.Trigger value={Tab.STEP_FOUR} status={status("step4", Tab.STEP_FOUR)} className="w-full max-w-[150px]">KYC</ProgressTabs.Trigger>
                  <ProgressTabs.Trigger value={Tab.STEP_FIVE} status={status("step5", Tab.STEP_FIVE)} className="w-full max-w-[150px]">Brands</ProgressTabs.Trigger>
                  <ProgressTabs.Trigger value={Tab.STEP_SIX} status={activeTab === Tab.STEP_SIX ? "in-progress" : "not-started"} className="w-full max-w-[150px]">Bank</ProgressTabs.Trigger>
                </ProgressTabs.List>
              </FocusModal.Header>
              <FocusModal.Body className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
                <ProgressTabs.Content value={Tab.STEP_ONE} className="m-0 outline-none">
                  <StepOne form={form} />
                </ProgressTabs.Content>
                <ProgressTabs.Content value={Tab.STEP_TWO} className="m-0 outline-none">
                  <StepThree form={form} isEditMode={isEditMode} />
                </ProgressTabs.Content>
                <ProgressTabs.Content value={Tab.STEP_THREE} className="m-0 outline-none">
                  <StepFour form={form} />
                </ProgressTabs.Content>
                <ProgressTabs.Content value={Tab.STEP_FOUR} className="m-0 outline-none">
                  <StepFive form={form} />
                </ProgressTabs.Content>
                <ProgressTabs.Content value={Tab.STEP_FIVE} className="m-0 outline-none">
                  <StepSix form={form} />
                </ProgressTabs.Content>
                <ProgressTabs.Content value={Tab.STEP_SIX} className="m-0 outline-none">
                  <StepSeven form={form} />
                </ProgressTabs.Content>
              </FocusModal.Body>
            </ProgressTabs>
            <FocusModal.Footer className="shrink-0 border-t border-ui-border-base">
              <div className="flex items-center justify-end gap-x-2">
                <Button variant="secondary" size="small" type="button" onClick={handleClose}>
                  {t("actions.cancel")}
                </Button>
                {isLastStep ? (
                  <Button size="small" className="whitespace-nowrap" isLoading={isLoading} type="submit" form="seller-form">
                    {t("actions.save")}
                  </Button>
                ) : (
                  <Button
                    size="small"
                    className="whitespace-nowrap"
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      const next = getNextTab()
                      queueMicrotask(() => onTabChange(next))
                    }}
                  >
                    {t("actions.continue")}
                  </Button>
                )}
              </div>
            </FocusModal.Footer>
          </FocusModal.Content>
        </FocusModal>
      </form>
    </FormProvider>
  )
}

