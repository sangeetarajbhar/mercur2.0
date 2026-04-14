import { zodResolver } from "@hookform/resolvers/zod";
import { Button, FocusModal, ProgressStatus, ProgressTabs, toast } from "@medusajs/ui";
import { useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useCreateStockLocation } from "../../../../hooks/api/stock-locations";
import { StepOne } from "./step-one";
import { StepThree } from "./step-three";
import { StepTwo } from "./step-two";
import {
  AddressType,
  CreateLocationDetailsSchema,
  CreateLocationSchema,
  CreateLocationSchemaType,
  IsDelay,
  StepTwoConditionalSchema,
} from "./schema";

enum Tab {
  STEP_ONE = "step-1",
  STEP_TWO = "step-2",
  STEP_THREE = "step-3",
}

const Page = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.STEP_ONE);
  const [validStepOne, setValidStepOne] = useState(false);
  const [validStepTwo, setValidStepTwo] = useState(false);
  const navigate = useNavigate();
  const { mutateAsync, isPending } = useCreateStockLocation();

  const form = useForm<CreateLocationSchemaType>({
    defaultValues: {
      name: "",
      address: {
        address_1: "",
        address_2: "",
        city: "",
        company: "",
        country_code: "",
        phone: "",
        postal_code: "",
        province: "",
      },
      seller_id: "",
      return_location_id: "",
      latitude: "",
      longitude: "",
      status: 0,
      servisibility_status: 0,
      start_time: "",
      end_time: "",
      partner_id: "",
      location_type: 0,
      address_type: 0,
      partner_wh_code: "",
      lead_time: "",
      managed_by: "",
      first_name: "",
      last_name: "",
      email: "",
      is_delay: IsDelay.FALSE,
      delay_value: "",
      delay_message: "",
      pan_number: "",
      pan_pdf: [],
      gst_number: "",
      gst_pdf: [],
      fssai_number: "",
      fssai_pdf: [],
    },
    resolver: zodResolver(CreateLocationSchema),
  });

  const setZodErrors = (errors: { path: (string | number)[]; message: string }[]) => {
    errors.forEach((error) => {
      form.setError(error.path.join(".") as keyof CreateLocationSchemaType, {
        message: error.message,
      });
    });
  };

  const stepOneFieldPaths = [
    "name",
    "address.address_1",
    "address.address_2",
    "address.city",
    "address.company",
    "address.country_code",
    "address.phone",
    "address.postal_code",
    "address.province",
    "latitude",
    "longitude",
    "status",
    "first_name",
    "last_name",
    "email",
  ] as const;

  const stepTwoFieldPaths = [
    "seller_id",
    "return_location_id",
    "servisibility_status",
    "start_time",
    "end_time",
    "partner_id",
    "location_type",
    "address_type",
    "partner_wh_code",
    "lead_time",
    "managed_by",
    "is_delay",
    "delay_value",
    "delay_message",
  ] as const;

  const validateStepTwoCustom = (values: CreateLocationSchemaType) => {
    let failed = false;
    form.clearErrors(["partner_wh_code", "lead_time", "managed_by", "delay_value", "delay_message"]);

    if (Number(values.address_type) === AddressType.SHIPPING) {
      if (!values.partner_wh_code) {
        form.setError("partner_wh_code", { message: "Partner WH Code is required" });
        failed = true;
      }
      if (!values.lead_time) {
        form.setError("lead_time", { message: "Lead Time is required" });
        failed = true;
      }
      if (!values.managed_by) {
        form.setError("managed_by", { message: "Managed By is required" });
        failed = true;
      }
    }
    if (Number(values.is_delay) === IsDelay.TRUE && !values.delay_value) {
      form.setError("delay_value", { message: "Delay Value is required" });
      failed = true;
    }
    return failed;
  };

  const onTabChange = (tab: Tab) => {
    if (tab === Tab.STEP_TWO) {
      form.clearErrors(stepOneFieldPaths);
      const result = CreateLocationDetailsSchema.safeParse(form.getValues());
      if (!result.success) {
        setZodErrors(result.error.errors);
        setValidStepOne(false);
        return;
      }
      setValidStepOne(true);
    }

    if (tab === Tab.STEP_THREE) {
      form.clearErrors(stepTwoFieldPaths);
      const values = form.getValues();
      const result = StepTwoConditionalSchema.safeParse(values);
      const hasCustomErrors = validateStepTwoCustom(values);
      if (!result.success) {
        setZodErrors(result.error.errors);
        return;
      }
      if (hasCustomErrors) {
        return;
      }
      setValidStepTwo(true);
    }

    setActiveTab(tab);
  };

  const onSubmit = form.handleSubmit(async (values) => {
    const additionalData = {
      seller_id: values.seller_id,
      return_location_id: values.return_location_id,
      latitude: values.latitude,
      longitude: values.longitude,
      status: values.status,
      servisibility_status: values.servisibility_status,
      start_time: values.start_time,
      end_time: values.end_time,
      partner_id: values.partner_id,
      location_type: values.location_type,
      address_type: values.address_type,
      partner_wh_code: values.partner_wh_code,
      lead_time: values.lead_time,
      managed_by: values.managed_by,
      first_name: values.first_name,
      last_name: values.last_name,
      email: values.email,
      is_delay: values.is_delay,
      delay_value: values.delay_value,
      delay_message: values.delay_message,
      pan_number: values.pan_number,
      pan_pdf: values.pan_pdf,
      gst_number: values.gst_number,
      gst_pdf: values.gst_pdf,
      fssai_number: values.fssai_number,
      fssai_pdf: values.fssai_pdf,
    };

    await mutateAsync(
      {
        name: values.name,
        address: values.address,
        additional_data: additionalData,
      },
      {
        onSuccess: () => {
          toast.success("Location created");
          navigate(-1);
        },
        onError: (e) => {
          toast.error((e as Error).message);
        },
      }
    );
  });

  const detailsStatus: ProgressStatus = validStepOne ? "completed" : "in-progress";
  const opsStatus: ProgressStatus = validStepOne
    ? validStepTwo
      ? "completed"
      : "in-progress"
    : "not-started";
  const docsStatus: ProgressStatus = validStepTwo ? "in-progress" : "not-started";

  return (
    <FormProvider {...form}>
      <form id="location-form" onSubmit={onSubmit}>
        <FocusModal open={true} onOpenChange={(open) => !open && navigate(-1)}>
          <FocusModal.Content>
            <ProgressTabs
              value={activeTab}
              className="flex h-full flex-col overflow-hidden"
              onValueChange={(tab) => onTabChange(tab as Tab)}
            >
              <FocusModal.Header>
                <ProgressTabs.List className="-my-2 ml-2 min-w-0 flex-1 border-l">
                  <ProgressTabs.Trigger value={Tab.STEP_ONE} status={detailsStatus}>
                    Basic Details
                  </ProgressTabs.Trigger>
                  <ProgressTabs.Trigger value={Tab.STEP_TWO} status={opsStatus}>
                    Operational Details
                  </ProgressTabs.Trigger>
                  <ProgressTabs.Trigger value={Tab.STEP_THREE} status={docsStatus}>
                    Document Details
                  </ProgressTabs.Trigger>
                </ProgressTabs.List>
              </FocusModal.Header>
              <FocusModal.Body className="size-full overflow-hidden">
                <ProgressTabs.Content value={Tab.STEP_ONE} className="size-full overflow-y-auto">
                  <StepOne form={form} />
                </ProgressTabs.Content>
                <ProgressTabs.Content value={Tab.STEP_TWO} className="size-full overflow-y-auto">
                  <StepTwo form={form} />
                </ProgressTabs.Content>
                <ProgressTabs.Content value={Tab.STEP_THREE} className="size-full overflow-y-auto">
                  <StepThree form={form} />
                </ProgressTabs.Content>
              </FocusModal.Body>
            </ProgressTabs>
            <FocusModal.Footer>
              <div className="flex items-center justify-end gap-x-2">
                <Button variant="secondary" size="small" onClick={() => navigate(-1)}>
                  Cancel
                </Button>
                {activeTab === Tab.STEP_THREE ? (
                  <Button size="small" isLoading={isPending} type="submit" form="location-form">
                    Save
                  </Button>
                ) : (
                  <Button
                    size="small"
                    isLoading={isPending}
                    type="button"
                    onClick={() =>
                      onTabChange(activeTab === Tab.STEP_ONE ? Tab.STEP_TWO : Tab.STEP_THREE)
                    }
                  >
                    Continue
                  </Button>
                )}
              </div>
            </FocusModal.Footer>
          </FocusModal.Content>
        </FocusModal>
      </form>
    </FormProvider>
  );
};

export default Page;
