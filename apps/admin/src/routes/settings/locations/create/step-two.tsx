import { Input, Select } from "@medusajs/ui";
import { useQuery } from "@tanstack/react-query";
import { Controller, UseFormReturn } from "react-hook-form";
import { useStockLocations } from "../../../../hooks/api/stock-locations";
import {
  AddressType,
  AddressTypeMap,
  CreateLocationSchemaType,
  IsDelay,
  IsDelayOption,
  LocationType,
  LocationTypeMap,
  ServisibilityStatusTypeMap,
} from "./schema";

type Option = { id: string; name: string };
type Props = { form: UseFormReturn<CreateLocationSchemaType> };

const FieldError = ({ message }: { message?: string }) =>
  message ? <p className="text-ui-fg-error text-xs">{message}</p> : null;

export const StepTwo = ({ form }: Props) => {
  const errors = form.formState.errors;
  const locationType = form.watch("location_type");
  const isDelay = form.watch("is_delay");
  const addressType = form.watch("address_type");

  const { data: partnersData } = useQuery<{ partners: Option[] }>({
    queryKey: ["admin_partner_list"],
    queryFn: async () => {
      const response = await fetch("/admin/partner?limit=100&offset=0", {
        credentials: "include",
      });
      if (!response.ok) {
        return { partners: [] };
      }
      return response.json();
    },
  });

  const { data: sellersData } = useQuery<{ sellers: Option[] }>({
    queryKey: ["admin_seller_list"],
    queryFn: async () => {
      const response = await fetch("/admin/sellers?limit=100&offset=0", {
        credentials: "include",
      });
      if (!response.ok) {
        return { sellers: [] };
      }
      return response.json();
    },
  });

  const { stock_locations: locations = [] } = useStockLocations({ limit: 100, offset: 0 });

  return (
    <div className="flex flex-1 flex-col items-center overflow-y-auto">
      <div className="flex w-full max-w-[720px] flex-col gap-y-8 px-2 py-16">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="txt-compact-small-plus mb-1 block">Servisibility Status</label>
            <Controller
              control={form.control}
              name="servisibility_status"
              render={({ field }) => (
                <Select
                  size="small"
                  value={field.value ? String(field.value) : ""}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <Select.Trigger>
                    <Select.Value placeholder="Select Servisibility Status" />
                  </Select.Trigger>
                  <Select.Content>
                    {Object.entries(ServisibilityStatusTypeMap).map(([id, label]) => (
                      <Select.Item key={id} value={id}>
                        {label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
              )}
            />
            <FieldError message={errors.servisibility_status?.message} />
          </div>

          <div>
            <label className="txt-compact-small-plus mb-1 block">Select Partner</label>
            <Controller
              control={form.control}
              name="partner_id"
              render={({ field }) => (
                <Select size="small" value={field.value || ""} onValueChange={field.onChange}>
                  <Select.Trigger>
                    <Select.Value placeholder="Select partner" />
                  </Select.Trigger>
                  <Select.Content>
                    {(partnersData?.partners || []).map((p) => (
                      <Select.Item key={p.id} value={p.id}>
                        {p.name}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
              )}
            />
            <FieldError message={errors.partner_id?.message} />
          </div>

          <div>
            <label className="txt-compact-small-plus mb-1 block">Start Time</label>
            <Input type="time" size="small" {...form.register("start_time")} />
            <FieldError message={errors.start_time?.message} />
          </div>
          <div>
            <label className="txt-compact-small-plus mb-1 block">End Time</label>
            <Input type="time" size="small" {...form.register("end_time")} />
            <FieldError message={errors.end_time?.message} />
          </div>

          <div>
            <label className="txt-compact-small-plus mb-1 block">Address Type</label>
            <Controller
              control={form.control}
              name="address_type"
              render={({ field }) => (
                <Select
                  size="small"
                  value={field.value ? String(field.value) : ""}
                  onValueChange={(v) => {
                    field.onChange(Number(v));
                    form.setValue("partner_wh_code", "");
                    form.setValue("lead_time", "");
                    form.setValue("managed_by", "");
                  }}
                >
                  <Select.Trigger>
                    <Select.Value placeholder="Select Address Type" />
                  </Select.Trigger>
                  <Select.Content>
                    {Object.entries(AddressTypeMap).map(([id, label]) => (
                      <Select.Item key={id} value={id}>
                        {label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
              )}
            />
            <FieldError message={errors.address_type?.message} />
          </div>

          <div>
            <label className="txt-compact-small-plus mb-1 block">Location Type</label>
            <Controller
              control={form.control}
              name="location_type"
              render={({ field }) => (
                <Select
                  size="small"
                  value={field.value ? String(field.value) : ""}
                  onValueChange={(v) => {
                    field.onChange(Number(v));
                    form.setValue("is_delay", IsDelay.FALSE);
                    form.setValue("delay_value", "");
                    form.setValue("delay_message", "");
                  }}
                >
                  <Select.Trigger>
                    <Select.Value placeholder="Select Location Type" />
                  </Select.Trigger>
                  <Select.Content>
                    {Object.entries(LocationTypeMap).map(([id, label]) => (
                      <Select.Item key={id} value={id}>
                        {label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
              )}
            />
            <FieldError message={errors.location_type?.message} />
          </div>

          <div>
            <label className="txt-compact-small-plus mb-1 block">Assign Location to Seller</label>
            <Controller
              control={form.control}
              name="seller_id"
              render={({ field }) => (
                <Select size="small" value={field.value || ""} onValueChange={field.onChange}>
                  <Select.Trigger>
                    <Select.Value placeholder="Select seller" />
                  </Select.Trigger>
                  <Select.Content>
                    {(sellersData?.sellers || []).map((s) => (
                      <Select.Item key={s.id} value={s.id}>
                        {s.name}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
              )}
            />
            <FieldError message={errors.seller_id?.message} />
          </div>

          <div>
            <label className="txt-compact-small-plus mb-1 block">Return Location</label>
            <Controller
              control={form.control}
              name="return_location_id"
              render={({ field }) => (
                <Select size="small" value={field.value || ""} onValueChange={field.onChange}>
                  <Select.Trigger>
                    <Select.Value placeholder="Select return location" />
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="self">Return to Self</Select.Item>
                    {locations.map((loc) => (
                      <Select.Item key={loc.id} value={loc.id}>
                        {String(loc.name || loc.id)}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
              )}
            />
            <FieldError message={errors.return_location_id?.message} />
          </div>

          {addressType === AddressType.SHIPPING && (
            <>
              <div>
                <label className="txt-compact-small-plus mb-1 block">Partner WH Code</label>
                <Input size="small" {...form.register("partner_wh_code")} />
                <FieldError message={errors.partner_wh_code?.message} />
              </div>
              <div>
                <label className="txt-compact-small-plus mb-1 block">Lead Time</label>
                <Input size="small" {...form.register("lead_time")} />
                <FieldError message={errors.lead_time?.message} />
              </div>
              <div>
                <label className="txt-compact-small-plus mb-1 block">Managed By</label>
                <Input size="small" {...form.register("managed_by")} />
                <FieldError message={errors.managed_by?.message} />
              </div>
            </>
          )}

          {locationType === LocationType.DARK_STORE && (
            <>
              <div>
                <label className="txt-compact-small-plus mb-1 block">
                  Is Delay (e.g: Rain, lots of order/traffic etc)
                </label>
                <Controller
                  control={form.control}
                  name="is_delay"
                  render={({ field }) => (
                    <Select
                      size="small"
                      value={field.value ? String(field.value) : ""}
                      onValueChange={(v) => {
                        field.onChange(Number(v));
                        form.setValue("delay_value", "");
                        form.setValue("delay_message", "");
                      }}
                    >
                      <Select.Trigger>
                        <Select.Value placeholder="Select Is Delay" />
                      </Select.Trigger>
                      <Select.Content>
                        {Object.entries(IsDelayOption).map(([id, label]) => (
                          <Select.Item key={id} value={id}>
                            {label}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select>
                  )}
                />
                <FieldError message={errors.is_delay?.message} />
              </div>
              {isDelay === IsDelay.TRUE && (
                <>
                  <div>
                    <label className="txt-compact-small-plus mb-1 block">
                      Delay Value (in minutes)
                    </label>
                    <Input size="small" {...form.register("delay_value")} />
                    <FieldError message={errors.delay_value?.message} />
                  </div>
                  <div>
                    <label className="txt-compact-small-plus mb-1 block">
                      Delay Message (This message will be shown to the customer on mobile)
                      (optional)
                    </label>
                    <Input size="small" {...form.register("delay_message")} />
                    <FieldError message={errors.delay_message?.message} />
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
