import { Tooltip } from "@medusajs/ui";
import { formatDateShort } from "../../../lib/date-utils";

type DateCellProps = {
  date?: Date | string | null;
  updated_at_date?: Date | string | null;
};

export const DateCell = ({ date, updated_at_date }: DateCellProps) => {
  if (!date) {
    return (
      <div className="flex h-full w-full items-center overflow-hidden">
        <span className="text-ui-fg-muted">–</span>
      </div>
    );
  }

  const createdAtFormatted = formatDateShort(date);
  const updatedAtFormatted = updated_at_date
    ? formatDateShort(updated_at_date)
    : null;

  return (
    <div className="flex h-full w-full items-center overflow-hidden">
      <Tooltip
        className="z-10"
        content={
          <div className="flex flex-col gap-1 text-pretty">
            <span>Created At: {createdAtFormatted}</span>
            {updatedAtFormatted && (
              <span>Updated At: {updatedAtFormatted}</span>
            )}
          </div>
        }
      >
        <span className="truncate">{createdAtFormatted}</span>
      </Tooltip>
    </div>
  );
};

export const DateHeader = () => {
  return (
    <div className="flex h-full w-full items-center">
      <span className="truncate">Date</span>
    </div>
  );
};
