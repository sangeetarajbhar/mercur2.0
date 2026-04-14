import { Heading, Input, Select, Text } from "@medusajs/ui";
import { Controller, UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { CreateLocationSchemaType, StatusTypeMap } from "./schema";
import { countries } from "../../../../lib/data/countries";

type Props = {
  form: UseFormReturn<CreateLocationSchemaType>;
};

const FieldError = ({ message }: { message?: string }) =>
  message ? <p className="text-ui-fg-error text-xs">{message}</p> : null;

export const StepOne = ({ form }: Props) => {
  const { t } = useTranslation();
  const errors = form.formState.errors;

  return (
    <div className="flex flex-1 flex-col items-center overflow-y-auto">
      <div className="flex w-full max-w-[720px] flex-col gap-y-8 px-2 py-16">
        <div>
          <Heading className="capitalize">
            {t("stockLocations.create.header", "Create Stock Location")}
          </Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {t(
              "stockLocations.create.hint",
              "A stock location is a physical site where products are stored and shipped from."
            )}
          </Text>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="txt-compact-small-plus mb-1 block">
              {t("fields.name", "Name")}
            </label>
            <Input size="small" {...form.register("name")} />
            <FieldError message={errors.name?.message} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="txt-compact-small-plus mb-1 block">
              {t("fields.address", "Address")}
            </label>
            <Input size="small" maxLength={100} {...form.register("address.address_1")} />
            <FieldError message={errors.address?.address_1?.message} />
          </div>
          <div>
            <label className="txt-compact-small-plus mb-1 block">
              {t("fields.address2", "Apartment, suite, etc.")} ({t("fields.optional", "Optional")})
            </label>
            <Input size="small" {...form.register("address.address_2")} />
          </div>
          <div>
            <label className="txt-compact-small-plus mb-1 block">
              {t("fields.postalCode", "Postal Code")}
            </label>
            <Input size="small" maxLength={6} inputMode="numeric" {...form.register("address.postal_code")} />
            <FieldError message={errors.address?.postal_code?.message} />
          </div>
          <div>
            <label className="txt-compact-small-plus mb-1 block">
              {t("fields.city", "City")}
            </label>
            <Input size="small" {...form.register("address.city")} />
            <FieldError message={errors.address?.city?.message} />
          </div>
          <div>
            <label className="txt-compact-small-plus mb-1 block">
              {t("fields.country", "Country")}
            </label>
            <Controller
              control={form.control}
              name="address.country_code"
              render={({ field }) => (
                <Select
                  size="small"
                  value={field.value ? field.value.toLowerCase() : ""}
                  onValueChange={(v) => field.onChange(v)}
                >
                  <Select.Trigger className="w-full">
                    <Select.Value placeholder="Select country" />
                  </Select.Trigger>
                  <Select.Content>
                    {countries.map((country) => (
                      <Select.Item key={country.iso_2} value={country.iso_2.toLowerCase()}>
                        {country.display_name}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
              )}
            />
            <FieldError message={errors.address?.country_code?.message} />
          </div>
          <div>
            <label className="txt-compact-small-plus mb-1 block">
              {t("fields.state", "State")}
            </label>
            <Input size="small" {...form.register("address.province")} />
            <FieldError message={errors.address?.province?.message} />
          </div>
          <div>
            <label className="txt-compact-small-plus mb-1 block">
              {t("fields.company", "Company")} ({t("fields.optional", "Optional")})
            </label>
            <Input size="small" {...form.register("address.company")} />
          </div>
          <div>
            <label className="txt-compact-small-plus mb-1 block">
              {t("fields.firstName", "First Name")}
            </label>
            <Input size="small" {...form.register("first_name")} />
            <FieldError message={errors.first_name?.message} />
          </div>
          <div>
            <label className="txt-compact-small-plus mb-1 block">
              {t("fields.lastName", "Last Name")}
            </label>
            <Input size="small" {...form.register("last_name")} />
            <FieldError message={errors.last_name?.message} />
          </div>
          <div>
            <label className="txt-compact-small-plus mb-1 block">
              {t("fields.email", "Email")}
            </label>
            <Input size="small" {...form.register("email")} />
            <FieldError message={errors.email?.message} />
          </div>
          <div>
            <label className="txt-compact-small-plus mb-1 block">
              {t("fields.phone", "Phone")}
            </label>
            <Input size="small" maxLength={10} inputMode="tel" {...form.register("address.phone")} />
            <FieldError message={errors.address?.phone?.message} />
          </div>
          <div>
            <label className="txt-compact-small-plus mb-1 block">Latitude</label>
            <Input size="small" {...form.register("latitude")} />
            <FieldError message={errors.latitude?.message} />
          </div>
          <div>
            <label className="txt-compact-small-plus mb-1 block">Longitude</label>
            <Input size="small" {...form.register("longitude")} />
            <FieldError message={errors.longitude?.message} />
          </div>
          <div>
            <label className="txt-compact-small-plus mb-1 block">
              {t("fields.status", "Status")}
            </label>
            <Controller
              control={form.control}
              name="status"
              render={({ field }) => (
                <Select
                  size="small"
                  value={field.value ? String(field.value) : ""}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <Select.Trigger>
                    <Select.Value placeholder="Select Status" />
                  </Select.Trigger>
                  <Select.Content>
                    {Object.entries(StatusTypeMap).map(([id, label]) => (
                      <Select.Item key={id} value={id}>
                        {label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
              )}
            />
            <FieldError message={errors.status?.message} />
          </div>
        </div>
      </div>
    </div>
  );
};
