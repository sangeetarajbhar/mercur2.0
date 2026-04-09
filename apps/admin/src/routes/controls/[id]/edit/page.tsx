import { RouteDrawer } from "../../../../components/route-drawer/RouteDrawer";
import { useNavigate, useParams } from "react-router-dom";
import ControlsListPage from "../../page";
import { useControl } from "../../../../hooks/api/controls";
import { ControlEditForm } from "./control-edit-form";

const ControlEditPage = () => {
  const navigate = useNavigate();
  const params = useParams();

  const { data, isLoading } = useControl(params.id!);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!data) {
    return <div>Control not found</div>;
  }
    
  return (
    <>
      <ControlsListPage />
      <RouteDrawer 
        header="Edit control" 
        onClose={(open: boolean) => !open && navigate(-1)}
      >
        <ControlEditForm control={data} onSuccess={() => navigate(-1)} />
      </RouteDrawer>
    </>
  );
};

export default ControlEditPage;
