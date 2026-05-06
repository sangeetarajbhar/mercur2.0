import {
  Container,
  Heading,
  DataTable,
  useDataTable,
  DataTablePaginationState,
  Button,
} from "@medusajs/ui";
import type { RouteConfig } from "@mercurjs/dashboard-sdk";
import { MediaPlay, Plus } from "@medusajs/icons";
import { keepPreviousData } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useVideoEncodingJobsListTableColumns } from "./components/use-video-encoding-jobs-list-table-columns";
import { useVideoEncodingJobs } from "../../hooks/api/video-encoding-jobs";
import VideoEncodingJobsModal from "./create/video-encoding-jobs-modal";

const PAGE_SIZE = 20;

const VideoEncodingListTable = () => {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pagination, setPagination] = useState<DataTablePaginationState>({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const offset = pagination.pageIndex * pagination.pageSize;

  const { videoEncodingJobs, count, isError, error, isFetching } =
    useVideoEncodingJobs(
      {
        offset,
        limit: pagination.pageSize,
        q: debouncedSearch,
      },
      {
        placeholderData: keepPreviousData,
      }
    );

  const columns = useVideoEncodingJobsListTableColumns({});

  const table = useDataTable({
    data: videoEncodingJobs ?? [],
    columns,
    rowCount: count,
    isLoading: isFetching,
    pagination: {
      state: pagination,
      onPaginationChange: setPagination,
    },
    search: {
      state: search,
      onSearchChange: setSearch,
    },
    getRowId: (row) => row?.id || "",
  });

  if (isError) {
    throw error;
  }

  return (
    <Container>
      <div className="flex size-full flex-col overflow-hidden">
        <DataTable instance={table}>
          <DataTable.Toolbar className="flex flex-col items-start justify-between gap-2 md:flex-row md:items-center">
            <Heading>Video Encoding</Heading>
            <div className="flex items-center gap-x-2">
              <DataTable.Search placeholder="Search video encoding jobs..." />
              <Button
                size="small"
                onClick={() => setCreateModalOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Create
              </Button>
            </div>
          </DataTable.Toolbar>
          <DataTable.Table />
          <DataTable.Pagination />
        </DataTable>
      </div>
      <VideoEncodingJobsModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
      />
    </Container>
  );
};

export const config: RouteConfig = {
  label: "Video Encoding",
  icon: MediaPlay,
};

export default VideoEncodingListTable;
