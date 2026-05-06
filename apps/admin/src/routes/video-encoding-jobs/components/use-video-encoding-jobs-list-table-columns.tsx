import { useMemo } from "react";
import {
  ColumnDef,
  ColumnDefBase,
  createColumnHelper,
} from "@tanstack/react-table";
import { VideoEncodingJobs } from "../types";
import { Copy, Text } from "@medusajs/ui";
import { getCustomVideoEncodingJobStatus } from "../helpers/video-encoding-jobs-helpers";
import { StatusCell } from "./status-cell";
import { DateCell, DateHeader } from "./date-cell";

const columnHelper = createColumnHelper<VideoEncodingJobs>();

type UseVideoEncodingJobsTableColumnsProps = {
  exclude?: string[];
};

export const useVideoEncodingJobsListTableColumns = (
  props: UseVideoEncodingJobsTableColumnsProps
) => {
  const { exclude = [] } = props ?? {};

  const columns = useMemo(
    () => [
      columnHelper.accessor("id", {
        header: "Id",
        cell: ({ getValue }) => getValue(),
      }),
      columnHelper.accessor("reference_type", {
        header: "Reference Type",
        cell: ({ getValue }) => getValue(),
      }),
      columnHelper.accessor("file_name", {
        header: "File Name",
        cell: ({ getValue }) => getValue(),
      }),
      columnHelper.accessor("encoding_job_id", {
        header: "Job Id",
        cell: ({ getValue }) => {
          const encoding_job_id = getValue();
          return (
            <div className="flex h-full w-full items-center">
              <Text size="small" className="truncate">
                {encoding_job_id}
                <Copy
                  content={`${encoding_job_id}`}
                  className="text-ui-fg-muted"
                />
              </Text>
            </div>
          );
        },
      }),
      columnHelper.accessor("s3_path", {
        header: "S3 Path",
        cell: ({ getValue }) => {
          const s3_path = getValue();
          return (
            <div className="flex h-full w-full items-center">
              <Text
                size="small"
                className="text-ui-fg-subtle truncate max-w-[260px]"
                title={s3_path}
              >
                {s3_path}
              </Text>
              {s3_path && (
                <Copy
                  content={`${s3_path}`}
                  className="text-ui-fg-muted"
                />
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor("streaming_url", {
        header: "Streaming URL",
        cell: ({ getValue }) => {
          const streaming_url = getValue();
          if (!streaming_url) return "";
          return (
            <div className="flex h-full w-full items-center">
              <Text
                size="small"
                className="text-ui-fg-subtle truncate max-w-[260px]"
                title={streaming_url}
              >
                {streaming_url}
              </Text>
              {streaming_url && (
                <Copy
                  content={`${streaming_url}`}
                  className="text-ui-fg-muted"
                />
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor("thumbnail_video_url", {
        header: "Thumbnail URL",
        cell: ({ getValue }) => {
          const thumbnail_url = getValue();
          if (!thumbnail_url) return "";
          return (
            <div className="flex h-full w-full items-center">
              <Text
                size="small"
                className="text-ui-fg-subtle truncate max-w-[260px]"
                title={thumbnail_url}
              >
                {thumbnail_url}
              </Text>
              {thumbnail_url && (
                <Copy
                  content={`${thumbnail_url}`}
                  className="text-ui-fg-muted"
                />
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: ({ getValue }) => {
          const status = getValue();
          const { label, color } = getCustomVideoEncodingJobStatus(status);
          return <StatusCell color={color}>{label}</StatusCell>;
        },
      }),
      columnHelper.accessor("created_by", {
        header: "Created By",
        cell: ({ getValue, row }) => {
          const created_by = getValue();
          const user = row.original?.user;
          if (user?.first_name) {
            return `${user.first_name ?? ""} ${user?.last_name ?? ""}`.trim();
          }
          return created_by;
        },
      }),
      columnHelper.accessor("created_at", {
        header: () => <DateHeader />,
        cell: ({ getValue, row }) => {
          const created_at = getValue();
          const updated_at = row.original?.updated_at;
          const date =
            created_at instanceof Date ? created_at : new Date(created_at);
          const updated_at_date =
            updated_at instanceof Date ? updated_at : new Date(updated_at);
          return <DateCell date={date} updated_at_date={updated_at_date} />;
        },
      }),
    ],
    []
  );

  const isAccessorColumnDef = (
    c: any
  ): c is ColumnDef<VideoEncodingJobs> & { accessorKey: string } => {
    return c.accessorKey !== undefined;
  };

  const isDisplayColumnDef = (
    c: any
  ): c is ColumnDef<VideoEncodingJobs> & { id: string } => {
    return c.id !== undefined;
  };

  const shouldExclude = <TDef extends ColumnDefBase<VideoEncodingJobs, any>>(
    c: TDef
  ) => {
    if (isAccessorColumnDef(c)) {
      return exclude.includes(c.accessorKey);
    } else if (isDisplayColumnDef(c)) {
      return exclude.includes(c.id);
    }
    return false;
  };

  return columns.filter(
    (c) => !shouldExclude(c)
  ) as ColumnDef<VideoEncodingJobs>[];
};
