import { Button, FocusModal, Heading, Input, Switch, Text, toast } from "@medusajs/ui";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { LocationEditCustomFields } from "../../components/location-custom-fields";
import { useStockLocation, useUpdateStockLocation } from "../../../../../hooks/api/stock-locations";

type LocationFormProps = {
  location: {
    id: string;
    name: string;
    address?: Record<string, string>;
    is_active?: boolean;
  };
  onClose: () => void;
};

const LocationEditForm = ({ location, onClose }: LocationFormProps) => {
  const navigate = useNavigate();
  const { mutateAsync, isPending } = useUpdateStockLocation(location.id);

  const address = location.address || {};
  const [name, setName] = useState(String(location.name || ""));
  const [address1, setAddress1] = useState(address.address_1 || "");
  const [address2, setAddress2] = useState(address.address_2 || "");
  const [city, setCity] = useState(address.city || "");
  const [province, setProvince] = useState(address.province || "");
  const [postalCode, setPostalCode] = useState(address.postal_code || "");
  const [countryCode, setCountryCode] = useState(address.country_code || "");
  const [phone, setPhone] = useState(address.phone || "");
  const [isActive, setIsActive] = useState(Boolean(location.is_active ?? true));

  const onSave = async () => {
    await mutateAsync(
      {
        name,
        address: {
          address_1: address1,
          address_2: address2,
          city,
          province,
          postal_code: postalCode,
          country_code: countryCode,
          phone,
        },
        additional_data: {
          is_active: isActive,
        },
      },
      {
        onSuccess: () => {
          toast.success("Location updated");
          onClose();
        },
        onError: (e) => {
          toast.error((e as Error).message);
        },
      }
    );
  };

  return (
    <>
      <FocusModal.Body className="flex flex-1 flex-col overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl space-y-4 p-6">
          <div>
            <label className="txt-compact-small-plus mb-1 block">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="txt-compact-small-plus mb-1 block">Address</label>
            <Input value={address1} onChange={(e) => setAddress1(e.target.value)} />
          </div>
          <div>
            <label className="txt-compact-small-plus mb-1 block">Address 2</label>
            <Input value={address2} onChange={(e) => setAddress2(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="txt-compact-small-plus mb-1 block">City</label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div>
              <label className="txt-compact-small-plus mb-1 block">State</label>
              <Input value={province} onChange={(e) => setProvince(e.target.value)} />
            </div>
            <div>
              <label className="txt-compact-small-plus mb-1 block">Postal Code</label>
              <Input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
            </div>
            <div>
              <label className="txt-compact-small-plus mb-1 block">Country Code</label>
              <Input value={countryCode} onChange={(e) => setCountryCode(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="txt-compact-small-plus mb-1 block">Phone</label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            <Text>Active</Text>
          </div>

          <LocationEditCustomFields locationId={location.id} />
        </div>
      </FocusModal.Body>
      <FocusModal.Footer>
        <div className="flex items-center justify-end gap-x-2">
          <Button variant="secondary" size="small" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button size="small" isLoading={isPending} onClick={onSave}>
            Save
          </Button>
        </div>
      </FocusModal.Footer>
    </>
  );
};

const LocationEditPage = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { stock_location, isLoading } = useStockLocation(id);

  return (
    <FocusModal open={true} onOpenChange={(open) => !open && navigate(-1)}>
      <FocusModal.Content>
        <FocusModal.Header>
          <Heading level="h2">Edit Location</Heading>
        </FocusModal.Header>
        {isLoading ? (
          <FocusModal.Body className="flex flex-1 flex-col overflow-y-auto">
            <Text className="p-6">Loading location...</Text>
          </FocusModal.Body>
        ) : !stock_location ? (
          <FocusModal.Body className="flex flex-1 flex-col overflow-y-auto">
            <Text className="p-6">Location not found</Text>
          </FocusModal.Body>
        ) : (
          <LocationEditForm
            key={stock_location.id}
            location={{
              id: stock_location.id,
              name: stock_location.name,
              address: stock_location.address as Record<string, string> | undefined,
              is_active: (stock_location as Record<string, unknown>).is_active as boolean | undefined,
            }}
            onClose={() => navigate(-1)}
          />
        )}
      </FocusModal.Content>
    </FocusModal>
  );
};

export default LocationEditPage;
