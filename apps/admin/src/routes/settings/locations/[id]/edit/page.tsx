import { useParams } from "react-router-dom";
import { LocationWizard } from "../../shared/location-wizard";

export default function StockLocationEditRoute() {
  const { id = "" } = useParams();
  return <LocationWizard mode="edit" locationId={id} />;
}
