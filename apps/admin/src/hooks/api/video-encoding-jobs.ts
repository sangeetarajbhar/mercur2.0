import {
  QueryKey,
  UseQueryOptions,
  useQuery,
  useQueryClient,
  useMutation,
  UseMutationOptions,
} from "@tanstack/react-query";
import { queryKeysFactory } from "@mercurjs/dashboard-shared";
import { VideoEncodingJobs } from "../../routes/video-encoding-jobs/types";

export const videoEncodingJobsQueryKeys = queryKeysFactory(
  "video_encoding_jobs"
);

type VideoEncodingJobsResponse = {
  video_encoding_jobs: VideoEncodingJobs[];
  count: number;
  offset: number;
  limit: number;
};

const buildQueryString = (params?: Record<string, unknown>) => {
  if (!params) return "";
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    sp.set(key, String(value));
  });
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
};

type VideoEncodingJobsFilters = {
  created_at?: Record<string, unknown>;
  updated_at?: Record<string, unknown>;
  status?: string;
  sort?: string;
};

export const useVideoEncodingJobs = (
  query?: Record<string, unknown>,
  options?: Omit<
    UseQueryOptions<
      VideoEncodingJobsResponse,
      Error,
      VideoEncodingJobsResponse,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >,
  filters?: VideoEncodingJobsFilters
) => {
  const apiQuery: Record<string, unknown> = {
    ...query,
    ...(filters?.created_at && {
      created_at: JSON.stringify(filters.created_at),
    }),
    ...(filters?.updated_at && {
      updated_at: JSON.stringify(filters.updated_at),
    }),
    ...(filters?.status && { status: filters.status }),
    ...(filters?.sort && { order: filters.sort }),
  };

  const { data, isFetching, ...rest } = useQuery({
    queryKey: videoEncodingJobsQueryKeys.list(apiQuery),
    queryFn: async () => {
      const response = await fetch(
        `/admin/video-encoding-jobs${buildQueryString(apiQuery)}`,
        { credentials: "include" }
      );
      if (!response.ok) {
        throw new Error("Failed to fetch video encoding jobs");
      }
      return response.json();
    },
    ...options,
  });

  return {
    videoEncodingJobs:
      (data?.video_encoding_jobs as VideoEncodingJobs[]) || [],
    count: data?.count || 0,
    offset: data?.offset || 0,
    limit: data?.limit || 0,
    isFetching,
    ...rest,
  };
};

export const useGetPresignedUrl = (
  options?: UseMutationOptions<
    {
      presigned_url: string;
      s3_path: string;
      encoding_job_id: string;
      file_name: string;
    },
    Error,
    { reference_type: string; file_name: string; file_type: string }
  >
) => {
  return useMutation({
    mutationFn: async (payload: {
      reference_type: string;
      file_name: string;
      file_type: string;
    }) => {
      const response = await fetch(
        "/admin/video-encoding-jobs/presigned-url",
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!response.ok) {
        throw new Error("Failed to get presigned URL");
      }
      return response.json();
    },
    ...options,
  });
};

export const useCreateVideoEncodingJobs = (
  options?: UseMutationOptions<
    VideoEncodingJobsResponse,
    Error,
    {
      reference_type: string;
      s3_path: string;
      file_name: string;
      encoding_job_id: string;
    }
  >
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      reference_type: string;
      s3_path: string;
      file_name: string;
      encoding_job_id: string;
    }) => {
      const response = await fetch("/admin/video-encoding-jobs", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error("Failed to create video encoding job");
      }
      return response.json();
    },
    onSuccess: async (data, variables, context) => {
      await queryClient.invalidateQueries({
        queryKey: videoEncodingJobsQueryKeys.lists(),
      });
      options?.onSuccess?.(data, variables, context);
    },
    ...options,
  });
};
