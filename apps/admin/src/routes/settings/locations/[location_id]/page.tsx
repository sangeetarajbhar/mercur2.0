import { Button } from "@medusajs/ui";
import { LocationDetailPage } from "@mercurjs/admin/pages";
import { Link } from "react-router-dom";

/**
 * Mercur’s `LocationGeneralSection` only exposes “Edit” inside the `...` overflow menu
 * (`to: "edit"`). This adds a visible action that navigates the same way (relative `edit`).
 */
export default function StockLocationDetailRoute() {
  return (
    <div className="flex w-full flex-col">
      <div className="flex w-full flex-wrap items-center justify-end gap-2 border-b border-ui-border-base bg-ui-bg-base px-6 py-3">
        <Button size="small" variant="secondary" asChild>
          <Link to="edit" relative="path">
            Edit location
          </Link>
        </Button>
      </div>
      <LocationDetailPage />
    </div>
  );
}
