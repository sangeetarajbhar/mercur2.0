import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeysFactory } from "@mercurjs/dashboard-shared";

export type Promotion = {
  id: string;
  code?: string;
  status?: string;
};

export type PromotionListResponse = {
  promotions: Promotion[];
  count: number;
  offset: number;
  limit: number;
};

export type UsePromotionsParams = {
  limit?: number;
  offset?: number;
  q?: string;
  fields?: string;
};

const PROMOTIONS_QUERY_KEY = "admin_promotions" as const;
export const promotionsQueryKeys = queryKeysFactory(PROMOTIONS_QUERY_KEY);

const buildQueryString = (params?: Record<string, unknown>) => {
  if (!params) return "";
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    searchParams.set(key, String(value));
  });
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
};

const fetchPromotions = async (
  params?: UsePromotionsParams
): Promise<PromotionListResponse> => {
  const response = await fetch(
    `/admin/promotions${buildQueryString(params as Record<string, unknown>)}`,
    { credentials: "include" }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch promotions");
  }

  const data = await response.json();
  return {
    promotions: data.promotions || [],
    count: data.count ?? 0,
    offset: data.offset ?? 0,
    limit: data.limit ?? 0,
  };
};

export const usePromotions = (params?: UsePromotionsParams) => {
  return useQuery<PromotionListResponse>({
    queryKey: promotionsQueryKeys.list(params),
    queryFn: () => fetchPromotions(params),
  });
};

const INFINITE_PAGE_SIZE = 50;

/**
 * Paginated promotions loader. Attach `lastItemRef` to the last rendered
 * item to fetch the next page on scroll.
 */
export function usePromotionsInfinite(pageSize = INFINITE_PAGE_SIZE) {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [page, setPage] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const loadingRef = useRef(false);

  useEffect(() => {
    if (!hasNextPage || loadingRef.current) return;

    loadingRef.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(page > 0);
    if (page === 0) setInitialLoading(true);
    const offset = page * pageSize;

    fetchPromotions({ limit: pageSize, offset, fields: "id,code,status" })
      .then((res) => {
        const list = res.promotions ?? [];
        setPromotions((prev) => {
          if (prev.length > offset) return prev;
          const existingIds = new Set(prev.map((p) => p.id));
          const uniqueNew = list.filter((p) => !existingIds.has(p.id));
          return [...prev, ...uniqueNew];
        });
        const count = res.count ?? 0;
        setHasNextPage(
          count > offset + list.length || list.length === pageSize
        );
      })
      .catch(() => setHasNextPage(false))
      .finally(() => {
        setLoading(false);
        setInitialLoading(false);
        loadingRef.current = false;
      });
  }, [page, pageSize, hasNextPage]);

  const observer = useRef<IntersectionObserver | null>(null);
  const lastItemRef = useCallback(
    (node: HTMLElement | null) => {
      if (observer.current) observer.current.disconnect();
      if (!node || !hasNextPage || loading) return;
      observer.current = new IntersectionObserver(
        (entries) => {
          if (
            entries[0].isIntersecting &&
            hasNextPage &&
            !loading &&
            !loadingRef.current
          ) {
            setPage((p) => p + 1);
          }
        },
        { threshold: 0.1, rootMargin: "0px 0px 100px 0px" }
      );
      observer.current.observe(node);
    },
    [hasNextPage, loading]
  );

  return { promotions, hasNextPage, loading, initialLoading, lastItemRef };
}
