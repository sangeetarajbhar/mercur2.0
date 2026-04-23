import { UseFormReturn } from "react-hook-form";
import { CreateLocationSchemaType } from "../create/schema";

type CreateProps = {
  form: UseFormReturn<CreateLocationSchemaType>;
};

/**
 * Extra fields for the location create flow (same react-hook-form context as StepOne–Three).
 * Mercur admin is extended via `src/routes/` pages, not `@medusajs/admin-sdk` widget zones.
 */
export function LocationCreateCustomFields(_props: CreateProps) {
  return null;
}

type EditProps = {
  locationId: string;
};

/**
 * Extra sections for the location edit screen (e.g. read-only data, links, or fields outside the main form).
 */
export function LocationEditCustomFields(_props: EditProps) {
  return null;
}
