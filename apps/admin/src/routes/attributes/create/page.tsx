import { useQueryClient } from "@tanstack/react-query";
import { FocusModal, Button, toast, ProgressTabs } from "@medusajs/ui";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { AdminProductCategory } from "@medusajs/types";
import { z } from "zod";

import {
  AttributeForm,
  CreateAttributeFormSchema,
} from "../components/AttributeForm";
import {
  attributeQueryKeys,
  useCreateAttribute,
} from "../../../hooks/api/attributes";

type TabStatus = "not-started" | "in-progress" | "completed";

const CreateAttributePage = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<AdminProductCategory[]>([]);
  const [activeTab, setActiveTab] = useState<"details" | "type">("details");
  const [tabStatuses, setTabStatuses] = useState<{
    detailsStatus: TabStatus;
    typeStatus: TabStatus;
  }>({
    detailsStatus: "not-started",
    typeStatus: "not-started",
  });
  const queryClient = useQueryClient();
  const { mutateAsync: createAttribute } = useCreateAttribute();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(
          "/admin/product-categories?limit=10000",
          { credentials: "include" }
        );
        const data = await response.json();
        setCategories(data.product_categories || []);
      } catch (err) {
        // ###### category fetch failure, leave list empty
        console.error("Failed to fetch categories:", err);
      }
    };
    fetchCategories();
  }, []);

  const handleSave = async (
    data: z.infer<typeof CreateAttributeFormSchema>
  ) => {
    try {
      await createAttribute(data as Record<string, unknown>);
      queryClient.invalidateQueries({ queryKey: attributeQueryKeys.lists() });
      toast.success("Attribute created!");
      navigate(-1);
    } catch (error) {
      toast.error((error as Error).message);
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
        <ProgressTabs
          value={activeTab}
          onValueChange={(value) =>
            setActiveTab(value as "details" | "type")
          }
          className="w-full h-full overflow-y-auto"
        >
          <FocusModal.Header className="flex items-center justify-between bg-ui-bg-base w-full py-0 h-fit sticky top-0 z-10">
            <div className="w-full border-l h-full">
              <ProgressTabs.List className="justify-start flex w-full items-center">
                <ProgressTabs.Trigger
                  value="details"
                  status={tabStatuses.detailsStatus}
                >
                  Details
                </ProgressTabs.Trigger>
                <ProgressTabs.Trigger
                  value="type"
                  status={tabStatuses.typeStatus}
                >
                  Type
                </ProgressTabs.Trigger>
              </ProgressTabs.List>
            </div>
          </FocusModal.Header>
          <FocusModal.Body className="flex flex-col items-center py-16">
            <div>
              <AttributeForm
                onSubmit={handleSave}
                categories={categories}
                activeTab={activeTab}
                onFormStateChange={setTabStatuses}
              />
            </div>
          </FocusModal.Body>
        </ProgressTabs>
        <FocusModal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" form="attribute-form">
            Save
          </Button>
        </FocusModal.Footer>
      </FocusModal.Content>
    </FocusModal>
  );
};

export default CreateAttributePage;
