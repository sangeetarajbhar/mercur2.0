import { Control } from "../../types";
import { ControlForm, ControlFormData, ControlFormPayload } from "../../components/ControlForm";
import { useUpdateControl } from "../../../../hooks/api/controls";

interface ControlEditFormProps {
  control: Control;
  onSuccess?: () => void;
}

export const ControlEditForm = ({ control, onSuccess }: ControlEditFormProps) => {
  const updateControl = useUpdateControl(control.id);

  const initialValues: ControlFormData = {
    scope: control.scope,
    scope_id: control.scope_id,
    is_active: control.is_active,
    is_instant_enabled: control.is_instant_enabled,
    is_slotted_enabled: control.is_slotted_enabled,
    delay_minutes: control.delay_minutes,
    delay_message: control.delay_message || "",
    reason: control.reason ?? null,
  };

  const handleSubmit = async (payload: ControlFormPayload) => {
    await updateControl.mutateAsync(payload);
    onSuccess?.();
  };

  return (
    <ControlForm
      mode="edit"
      initialValues={initialValues}
      existingIconUrl={control.message_icon_url || null}
      onSubmit={handleSubmit}
      submitting={updateControl.isPending}
    />
  );
};

export default ControlEditForm;
