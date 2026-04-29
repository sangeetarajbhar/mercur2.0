import { useQueryClient } from "@tanstack/react-query";
import { FocusModal, Button, toast, ProgressTabs } from "@medusajs/ui";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { AdminProductCategory } from "@medusajs/types";
import { z } from "zod";

import {
  AttributeForm,
  CreateAttributeFormSchema,
} from "../../components/AttributeForm";
import {
  useAttribute,
  useUpdateAttribute,
  attributeQueryKeys,
} from "../../../../hooks/api/attributes";

type TabStatus = "not-started" | "in-progress" | "completed";

const EditAttributePage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [categories, setCategories] = useState<AdminProductCategory[]>([]);
  const [activeTab, setActiveTab] = useState<"details" | "type">("details");
  const [tabStatuses, setTabStatuses] = useState<{
    detailsStatus: TabStatus;
    typeStatus: TabStatus;
  }>({
    detailsStatus: "completed",
    typeStatus: "completed",
  });
  const queryClient = useQueryClient();

  const { attribute, isLoading } = useAttribute(
    id ?? "",
    {
      fields:
        "name,description,handle,ui_component,product_categories.name,possible_values.*,is_filterable,is_required",
    },
    { enabled: !!id }
  );

  const { mutateAsync } = useUpdateAttribute(id || "");

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
      await mutateAsync(data as Record<string, unknown>);
      queryClient.invalidateQueries({ queryKey: attributeQueryKeys.lists() });
      toast.success("Attribute updated!");
      navigate(-1);
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const handleClose = () => {
    navigate(-1);
  };

  if (isLoading || !attribute) {
    return null;
  }

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
          className="w-full h-full"
        >
          <FocusModal.Header className="flex items-center justify-between w-full py-0 h-fit">
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
                initialData={attribute}
                mode="update"
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

export default EditAttributePage;
