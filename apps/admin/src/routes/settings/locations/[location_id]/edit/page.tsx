import { useParams } from "react-router-dom";
import { LocationWizard } from "../../shared/location-wizard";

export default function StockLocationEditRoute() {
  const { location_id = "" } = useParams();
  return <LocationWizard mode="edit" locationId={location_id} />;
}
