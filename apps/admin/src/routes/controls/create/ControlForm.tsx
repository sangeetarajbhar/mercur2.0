import { ControlForm, ControlFormData, ControlFormPayload } from "../components/ControlForm";
import { useCreateControl } from "../../../hooks/api/controls";

const CreateControlForm = () => {
  const createControl = useCreateControl();

  const initialValues: ControlFormData = {
    scope: 'zone',
    scope_id: '',
    is_active: true,
    is_instant_enabled: true,
    is_slotted_enabled: true,
    delay_minutes: 0,
    delay_message: '',
    reason: null,
  };

  const handleSubmit = async (payload: ControlFormPayload) => {
    await createControl.mutateAsync(payload as any);
  };

  return (
    <ControlForm
      mode="create"
      initialValues={initialValues}
      onSubmit={handleSubmit}
      submitting={createControl.isPending}
    />
  );
};

export default CreateControlForm;
