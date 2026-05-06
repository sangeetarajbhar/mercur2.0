import { Tooltip } from "@medusajs/ui";
import { useTranslation } from "react-i18next";
import { toIST } from "../../../workflows/delivery-promise/utils/date-time-utils";

type DateCellProps = {
  date?: Date | string | null;
  updated_at_date?: Date | string | null;
};

export const DateCell = ({ date, updated_at_date }: DateCellProps) => {
  if (!date) {
    return <span>-</span>;
  }

  const createdAt = toIST(new Date(date as string));
  const formatDate = (value: Date) =>
    value.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  const createdAtFormatted = formatDate(createdAt);

  const updatedAtFormatted = updated_at_date
    ? formatDate(toIST(new Date(updated_at_date as string)))
    : null;

  return (
    <div className="flex h-full w-full items-center overflow-hidden">
      <Tooltip
        className="z-10"
        content={
          <div className="flex flex-col gap-1 text-pretty">
            <span>Created At: {createdAtFormatted}</span>
            {updatedAtFormatted ? (
              <span>Updated At: {updatedAtFormatted}</span>
            ) : null}
          </div>
        }
      >
        <span className="truncate">{createdAtFormatted}</span>
      </Tooltip>
    </div>
  );
};

export const DateHeader = () => {
  const { t } = useTranslation();

  return (
    <div className="flex h-full w-full items-center">
      <span className="truncate">{t("fields.date")}</span>
    </div>
  );
};
