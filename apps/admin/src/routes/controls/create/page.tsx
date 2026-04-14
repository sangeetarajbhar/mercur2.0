import {
  FocusModal,
  Heading,
  toast,
} from "@medusajs/ui";
import { useNavigate } from "react-router-dom";
import { ControlForm, ControlFormData, ControlFormPayload } from "../components/ControlForm";
import { useCreateControl } from "../../../hooks/api/controls";

const CreateControlPage = () => {
  const navigate = useNavigate();
  const { mutateAsync: createControl, isPending } = useCreateControl();
  const initialValues: ControlFormData = {
    scope: "zone",
    scope_id: "",
    is_active: true,
    is_instant_enabled: true,
    is_slotted_enabled: true,
    delay_minutes: 0,
    delay_message: "",
    reason: null,
  };

  const handleSave = async (data: ControlFormPayload) => {
    try {
      await createControl(data);
      toast.success("Control created successfully!");
      navigate(-1);
    } catch (error) {
      toast.error((error as Error).message);
      console.error(error);
    }
  };

  const handleClose = () => {
    navigate(-1);
  };

  return (
    <FocusModal
      open={true}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <FocusModal.Content>
        <FocusModal.Header>
          <Heading>Create Control</Heading>
        </FocusModal.Header>
        <FocusModal.Body className="flex flex-col items-center py-16 overflow-y-auto">
          <div>
            <ControlForm
              mode="create"
              initialValues={initialValues}
              onSubmit={handleSave}
              onCancel={handleClose}
              submitting={isPending}
            />
          </div>
        </FocusModal.Body>
      </FocusModal.Content>
    </FocusModal>
  );
};

export default CreateControlPage;
