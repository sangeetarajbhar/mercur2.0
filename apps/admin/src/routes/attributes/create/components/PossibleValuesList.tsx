import { Button, Input, IconButton, Label } from "@medusajs/ui";
import { XMark, ArrowUpMini, ArrowDownMini } from "@medusajs/icons";
import { useFieldArray, useFormContext, FieldValues } from "react-hook-form";

const PossibleValuesList = () => {
  const {
    control,
    register,
    formState: { errors },
    getValues,
    setValue,
  } = useFormContext<FieldValues>();

  const { fields, append, remove } = useFieldArray<FieldValues>({
    control,
    name: "possible_values",
  });

  type RHFFieldErrors = {
    possible_values?: Array<{ value?: { message?: string } }>;
  };
  const fieldErrors = errors as unknown as RHFFieldErrors;

  const handleMove = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= fields.length) return;

    const current = getValues("possible_values") as Array<{
      value: string;
      rank: number;
      metadata: Record<string, unknown>;
    }>;

    const reordered = [...current];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(newIndex, 0, moved);

    setValue(
      "possible_values",
      reordered.map((v, i) => ({
        value: v.value,
        rank: i,
        metadata: v.metadata || {},
      })),
      { shouldDirty: true }
    );
  };

  const handleAddValue = () => {
    append({
      value: "",
      rank: fields.length,
      metadata: {},
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between pb-1">
        <Label>Possible Values</Label>
        <Button
          type="button"
          variant="secondary"
          size="small"
          onClick={handleAddValue}
        >
          Add
        </Button>
      </div>

      {fields.map((field, index) => {
        const err = fieldErrors.possible_values?.[index]?.value;
        return (
          <div
            key={field.id}
            className="flex items-center gap-2 p-2 bg-ui-bg-component border border-ui-border-base rounded-xl mb-2"
          >
            <div className="flex flex-col">
              <IconButton
                type="button"
                variant="transparent"
                size="small"
                disabled={index === 0}
                onClick={() => handleMove(index, -1)}
                aria-label="Move up"
              >
                <ArrowUpMini />
              </IconButton>
              <IconButton
                type="button"
                variant="transparent"
                size="small"
                disabled={index === fields.length - 1}
                onClick={() => handleMove(index, 1)}
                aria-label="Move down"
              >
                <ArrowDownMini />
              </IconButton>
            </div>
            <div className="flex-1">
              <Input
                className="flex-1"
                aria-invalid={!!err}
                placeholder="Enter value"
                {...register(`possible_values.${index}.value`)}
              />
              {err?.message && (
                <span className="text-red-500 text-xs mt-1 block">
                  {err.message}
                </span>
              )}
            </div>
            <IconButton
              variant="transparent"
              size="small"
              type="button"
              onClick={() => remove(index)}
              aria-label="Remove"
            >
              <XMark />
            </IconButton>
          </div>
        );
      })}
    </div>
  );
};

export default PossibleValuesList;
