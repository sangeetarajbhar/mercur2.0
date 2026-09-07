import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Container,
  Heading,
  Text,
  Button,
  Table,
  Select,
  toast,
  useToggleState,
  FocusModal,
  Checkbox,
  Badge,
  Input,
  IconButton,
} from "@medusajs/ui";
import {
  CloudArrowDown,
  ChevronDown,
  ChevronRight,
  ListTree,
} from "@medusajs/icons";
import type { RouteConfig } from "@mercurjs/dashboard-sdk";

import {
  useDarkstoresFromExtensions,
  useOmniLocationsFromExtensions,
  useAllLocationExtensions,
  type EnrichedLocationExtension,
} from "../../hooks/api/stock-location-extensions";
import {
  useLocationHierarchies,
  useCreateLocationHierarchy,
  useDeleteLocationHierarchy,
  fetchLocationHierarchyTree,
  type LocationHierarchyRow,
} from "../../hooks/api/location-hierarchy";
import {
  ApiChildItem,
  ApiParentRow,
  LOCATION_TYPE_MAP,
  LocationHierarchyNode,
  StockLocation,
} from "./types";

const PAGE_SIZE = 10;
const OMNI_PAGE_SIZE = 10;
const MIN_SEARCH_CHARS = 3;
const SEARCH_DEBOUNCE_MS = 400;

type EnhancedHierarchyNode = {
  id: string;
  parent_location_id: string | null;
  location_id: string;
  location_type: string;
  seller?: { id: string; name: string };
  children: EnhancedHierarchyNode[];
};

function enhanceHierarchyTree(
  nodes: LocationHierarchyNode[],
  locations: StockLocation[],
  typeMap: Record<string, string>
): EnhancedHierarchyNode[] {
  return nodes.map((node) => {
    const location = locations.find((loc) => loc.id === node.child_location_id);
    const typeKey = location?.extensions?.[0]?.location_type || "Unknown";
    const locationType = typeMap[typeKey] || typeMap.Unknown;

    const seller = location?.seller
      ? { id: location.seller.id, name: location.seller.name }
      : undefined;

    return {
      id: node.id,
      parent_location_id: node.parent_location_id,
      location_id: node.child_location_id,
      location_type: locationType,
      seller,
      children: node.children
        ? enhanceHierarchyTree(node.children, locations, typeMap)
        : [],
    };
  });
}

function downloadAsJson(data: unknown, filename = "hierarchy-tree.json") {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

type ExtensionMap = Record<string, EnrichedLocationExtension>;

function buildParentRows(
  hierarchies: LocationHierarchyRow[],
  darkstoreMap: ExtensionMap,
  omniMap: ExtensionMap
): ApiParentRow[] {
  const grouped = new Map<string, LocationHierarchyRow[]>();
  for (const row of hierarchies) {
    const list = grouped.get(row.parent_location_id) ?? [];
    list.push(row);
    grouped.set(row.parent_location_id, list);
  }

  const rows: ApiParentRow[] = [];
  for (const [parentId, children] of grouped.entries()) {
    const parentMeta = darkstoreMap[parentId] ?? omniMap[parentId];
    const parentRow: ApiParentRow = {
      id: parentId,
      name: parentMeta?.name ?? parentId,
      location_type: parentMeta?.location_type ?? "1",
      child: children.map<ApiChildItem>((c) => {
        const childMeta = omniMap[c.child_location_id] ?? darkstoreMap[c.child_location_id];
        return {
          id: c.child_location_id,
          name: childMeta?.name ?? c.child_location_id,
          hierarchyId: c.id,
          created_at: c.created_at ?? "",
          stock_location_extension: {
            location_type: childMeta?.location_type ?? "2",
          },
        };
      }),
    };
    rows.push(parentRow);
  }

  rows.sort((a, b) => a.name.localeCompare(b.name));
  return rows;
}

const LocationHierarchyPage = () => {
  const [selectedParentId, setSelectedParentId] = useState<string>("");
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchForApi, setSearchForApi] = useState<string>("");
  const [pageOffset, setPageOffset] = useState(0);
  const [omniPageOffset, setOmniPageOffset] = useState(0);
  const [expandedParentIds, setExpandedParentIds] = useState<Set<string>>(
    new Set()
  );
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    const trimmed = searchQuery.trim();
    searchDebounceRef.current = setTimeout(() => {
      if (trimmed.length > 0 && trimmed.length < MIN_SEARCH_CHARS) {
        setSearchForApi("");
      } else {
        setSearchForApi(trimmed);
      }
      searchDebounceRef.current = null;
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery]);

  const toggleParentExpanded = (parentId: string) => {
    setExpandedParentIds((prev) => {
      const next = new Set(prev);
      if (next.has(parentId)) next.delete(parentId);
      else next.add(parentId);
      return next;
    });
  };

  const createModalState = useToggleState();

  const { data: darkstoresData, isLoading: isLoadingDarkstores } =
    useDarkstoresFromExtensions();

  const { data: darkstoreExtensions } = useAllLocationExtensions(1);
  const { data: omniExtensions } = useAllLocationExtensions(2);

  const {
    data: hierarchyListData,
    isLoading: isLoadingHierarchyPage,
    refetch: refetchHierarchies,
  } = useLocationHierarchies();

  const darkstoreMap = useMemo(
    () => darkstoreExtensions?.map ?? {},
    [darkstoreExtensions]
  );
  const omniMap = useMemo(
    () => omniExtensions?.map ?? {},
    [omniExtensions]
  );

  const allParentRows = useMemo(
    () => buildParentRows(hierarchyListData?.data ?? [], darkstoreMap, omniMap),
    [hierarchyListData?.data, darkstoreMap, omniMap]
  );

  const totalParents = allParentRows.length;
  const hierarchyData = useMemo(
    () => allParentRows.slice(pageOffset, pageOffset + PAGE_SIZE),
    [allParentRows, pageOffset]
  );

  const canPrevPage = pageOffset > 0;
  const canNextPage = pageOffset + PAGE_SIZE < totalParents;

  const childArray = (row: ApiParentRow) =>
    Array.isArray(row.child) ? row.child : [];

  const getChildDisplayName = (c: ApiChildItem) => {
    const seller = c.seller;
    if (!seller) return c.name ?? "";
    const sellerName = Array.isArray(seller) ? seller[0]?.name : seller.name;
    return sellerName ? `${sellerName} - ${c.name}` : c.name ?? "";
  };

  const locations: StockLocation[] = useMemo(() => {
    return hierarchyData.flatMap((row) => [
      { id: row.id, name: row.name } as StockLocation,
      ...childArray(row).map((c) => ({
        id: c.id,
        name: c.name,
        seller: Array.isArray(c.seller) ? c.seller[0] : c.seller,
      } as StockLocation)),
    ]);
  }, [hierarchyData]);

  const { data: omniData, isLoading: isLoadingOmniLocations } =
    useOmniLocationsFromExtensions({
      search: searchForApi,
      limit: OMNI_PAGE_SIZE,
      offset: omniPageOffset,
    });
  const childLocations = omniData?.locations ?? [];
  const childLocationsTotal = omniData?.total ?? 0;
  const canPrevOmniPage = omniPageOffset > 0;
  const canNextOmniPage = omniPageOffset + OMNI_PAGE_SIZE < childLocationsTotal;

  const { mutateAsync: createHierarchyAsync } = useCreateLocationHierarchy();
  const { mutate: deleteHierarchy } = useDeleteLocationHierarchy();

  const resetCreateForm = () => {
    setSelectedParentId("");
    setSelectedChildIds([]);
    setSearchQuery("");
    setSearchForApi("");
    setOmniPageOffset(0);
  };

  const handleCreateHierarchy = async () => {
    if (!selectedParentId || selectedChildIds.length === 0) {
      toast.error("Please select parent and at least one child location");
      return;
    }

    if (selectedChildIds.includes(selectedParentId)) {
      toast.error("Parent and child locations cannot be the same");
      return;
    }

    try {
      for (const childId of selectedChildIds) {
        await createHierarchyAsync({
          parent_location_id: selectedParentId,
          child_location_id: childId,
        });
      }

      toast.success(
        `Created ${selectedChildIds.length} location hierarchy mappings successfully`
      );
      refetchHierarchies();
      createModalState.close();
      resetCreateForm();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to create some location hierarchy mappings";
      toast.error(message);
    }
  };

  const handleDeleteHierarchy = (id: string) => {
    deleteHierarchy(id, {
      onSuccess: () => {
        toast.success("Location hierarchy mapping deleted successfully");
        refetchHierarchies();
      },
      onError: (error: Error) => {
        toast.error(
          error?.message || "Failed to delete location hierarchy mapping"
        );
      },
    });
  };

  const handleDownloadTree = async (locationId: string) => {
    toast.info("Preparing location hierarchy tree for download...");
    try {
      const data = await fetchLocationHierarchyTree(locationId);
      if (!data.hierarchy_tree?.length) {
        toast.warning("No hierarchy found for this location.");
        return;
      }

      const enhancedTree = enhanceHierarchyTree(
        data.hierarchy_tree,
        locations,
        LOCATION_TYPE_MAP
      );

      downloadAsJson(enhancedTree, `location-tree-${locationId}.json`);
      toast.success("Hierarchy tree downloaded!");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to fetch location hierarchy tree";
      toast.error(message);
    }
  };

  return (
    <Container>
      <div className="flex items-center justify-between mb-4">
        <Heading level="h1">Location Hierarchy Management</Heading>
        <Button
          variant="secondary"
          onClick={createModalState.open}
          disabled={isLoadingHierarchyPage}
        >
          Create
        </Button>
      </div>

      <div className="mb-6">
        <Text>
          Manage the hierarchy between dark stores and omni stores. Each dark
          store can have multiple omni stores mapped to it.
        </Text>
      </div>

      {isLoadingHierarchyPage ? (
        <div>Loading location hierarchies...</div>
      ) : (
        <>
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Location Hierarchy</Table.HeaderCell>
                <Table.HeaderCell>Type</Table.HeaderCell>
                <Table.HeaderCell>Created At</Table.HeaderCell>
                <Table.HeaderCell>Actions</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {hierarchyData.length === 0 ? (
                <Table.Row>
                  <Table.Cell
                    className="text-center"
                    style={{ gridColumn: "span 4" }}
                  >
                    No location hierarchies found
                  </Table.Cell>
                </Table.Row>
              ) : (
                hierarchyData.map((row) => {
                  const parentId = row.id;
                  const isExpanded = expandedParentIds.has(parentId);
                  const hasChildren = childArray(row).length > 0;
                  return (
                    <React.Fragment key={parentId}>
                      <Table.Row>
                        <Table.Cell>
                          <div className="flex items-center gap-1">
                            {hasChildren ? (
                              <button
                                type="button"
                                onClick={() => toggleParentExpanded(parentId)}
                                className="p-0.5 rounded hover:bg-ui-bg-base-hover"
                                aria-label={isExpanded ? "Collapse" : "Expand"}
                              >
                                {isExpanded ? (
                                  <ChevronDown className="text-ui-fg-muted" />
                                ) : (
                                  <ChevronRight className="text-ui-fg-muted" />
                                )}
                              </button>
                            ) : (
                              <span className="w-5" />
                            )}
                            <Text>{row.name || parentId}</Text>
                            <span className="text-ui-fg-muted ml-1">
                              (Dark Store)
                            </span>
                          </div>
                        </Table.Cell>
                        <Table.Cell>
                          <Badge>
                            {LOCATION_TYPE_MAP[row.location_type ?? ""] ??
                              LOCATION_TYPE_MAP.Unknown}
                          </Badge>
                        </Table.Cell>
                        <Table.Cell>—</Table.Cell>
                        <Table.Cell>
                          <IconButton
                            onClick={() => handleDownloadTree(parentId)}
                          >
                            <CloudArrowDown />
                          </IconButton>
                        </Table.Cell>
                      </Table.Row>
                      {isExpanded &&
                        childArray(row).map((childRow) => (
                          <Table.Row key={childRow.hierarchyId}>
                            <Table.Cell>
                              <div
                                className="flex items-center"
                                style={{ paddingLeft: "2rem" }}
                              >
                                <span className="text-gray-400 mr-2">└─</span>
                                <Text>{getChildDisplayName(childRow)}</Text>
                                <span className="text-ui-fg-muted ml-1">
                                  (Omni Store)
                                </span>
                              </div>
                            </Table.Cell>
                            <Table.Cell>
                              <Badge>
                                {LOCATION_TYPE_MAP[
                                  childRow.stock_location_extension
                                    ?.location_type ?? "2"
                                ] ?? LOCATION_TYPE_MAP.Unknown}
                              </Badge>
                            </Table.Cell>
                            <Table.Cell>
                              {childRow.created_at
                                ? new Date(childRow.created_at).toLocaleDateString()
                                : "—"}
                            </Table.Cell>
                            <Table.Cell>
                              <Button
                                variant="danger"
                                size="small"
                                onClick={() =>
                                  handleDeleteHierarchy(childRow.hierarchyId)
                                }
                              >
                                Delete
                              </Button>
                            </Table.Cell>
                          </Table.Row>
                        ))}
                    </React.Fragment>
                  );
                })
              )}
            </Table.Body>
          </Table>
          {totalParents > 0 && (
            <Table.Pagination
              count={totalParents}
              pageSize={PAGE_SIZE}
              pageIndex={Math.floor(pageOffset / PAGE_SIZE)}
              pageCount={Math.ceil(totalParents / PAGE_SIZE)}
              canPreviousPage={canPrevPage}
              canNextPage={canNextPage}
              previousPage={() =>
                setPageOffset((p) => Math.max(0, p - PAGE_SIZE))
              }
              nextPage={() =>
                setPageOffset((p) =>
                  Math.min(totalParents - PAGE_SIZE, p + PAGE_SIZE)
                )
              }
            />
          )}
        </>
      )}

      <FocusModal
        open={createModalState.state}
        onOpenChange={(open) => {
          if (!open) {
            resetCreateForm();
          }
          createModalState.toggle();
        }}
      >
        <FocusModal.Content>
          <FocusModal.Header />
          <FocusModal.Body className="flex flex-col items-center py-16">
            <div>
              <Heading level="h2">Create Location Hierarchy</Heading>
              <Text size="small" className="text-ui-fg-subtle mb-6">
                Map a Dark Store to an Omni Store to create a hierarchy.
              </Text>

              <div className="mb-4">
                <Text className="mb-2">Parent Location</Text>
                <Select
                  value={selectedParentId}
                  onValueChange={setSelectedParentId}
                  disabled={isLoadingDarkstores}
                >
                  <Select.Trigger>
                    <Select.Value
                      placeholder={
                        isLoadingDarkstores
                          ? "Loading darkstores..."
                          : "Select a dark store"
                      }
                    />
                  </Select.Trigger>
                  <Select.Content>
                    {isLoadingDarkstores ? (
                      <Select.Item value="loading" disabled>
                        Loading darkstores...
                      </Select.Item>
                    ) : (darkstoresData?.darkstores?.length ?? 0) === 0 ? (
                      <Select.Item value="no-locations" disabled>
                        No darkstores available
                      </Select.Item>
                    ) : (
                      (darkstoresData?.darkstores || []).map(
                        (ds: { id: string; name: string }) => (
                          <Select.Item key={ds.id} value={ds.id}>
                            {ds.name}
                          </Select.Item>
                        )
                      )
                    )}
                  </Select.Content>
                </Select>
              </div>

              <div className="mb-6">
                <Text className="mb-2">Child Locations (Multiple)</Text>
                <div className="mb-4">
                  <div className="w-full">
                    <Input
                      placeholder="Search by location name (min 3 characters)..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setOmniPageOffset(0);
                      }}
                      id="search-input"
                      type="search"
                    />
                    {searchQuery.trim().length > 0 &&
                      searchQuery.trim().length < MIN_SEARCH_CHARS && (
                        <Text
                          size="small"
                          className="text-ui-fg-muted mt-1"
                        >
                          Type at least {MIN_SEARCH_CHARS} characters to search.
                        </Text>
                      )}
                  </div>
                </div>
                <div className="border rounded">
                  <Table>
                    <Table.Header>
                      <Table.Row>
                        <Table.HeaderCell>Select</Table.HeaderCell>
                        <Table.HeaderCell>Name</Table.HeaderCell>
                        <Table.HeaderCell>Type</Table.HeaderCell>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {isLoadingOmniLocations ? (
                        <Table.Row>
                          <Table.Cell className="text-center">
                            Loading...
                          </Table.Cell>
                          <Table.Cell />
                          <Table.Cell />
                        </Table.Row>
                      ) : childLocations.length === 0 ? (
                        <Table.Row>
                          <Table.Cell className="text-center">
                            {searchForApi
                              ? "No locations found with that name."
                              : "No locations found."}
                          </Table.Cell>
                          <Table.Cell />
                          <Table.Cell />
                        </Table.Row>
                      ) : (
                        childLocations.map((location) => (
                          <Table.Row
                            key={location.id}
                            className="cursor-pointer hover:bg-ui-bg-base-hover"
                            onClick={() => {
                              if (selectedChildIds.includes(location.id)) {
                                setSelectedChildIds(
                                  selectedChildIds.filter(
                                    (id) => id !== location.id
                                  )
                                );
                              } else {
                                setSelectedChildIds([
                                  ...selectedChildIds,
                                  location.id,
                                ]);
                              }
                            }}
                          >
                            <Table.Cell>
                              <Checkbox
                                checked={selectedChildIds.includes(location.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedChildIds([
                                      ...selectedChildIds,
                                      location.id,
                                    ]);
                                  } else {
                                    setSelectedChildIds(
                                      selectedChildIds.filter(
                                        (id) => id !== location.id
                                      )
                                    );
                                  }
                                }}
                                id={`location-${location.id}`}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </Table.Cell>
                            <Table.Cell>{location.name}</Table.Cell>
                            <Table.Cell>
                              <Badge>Omni Store</Badge>
                            </Table.Cell>
                          </Table.Row>
                        ))
                      )}
                    </Table.Body>
                  </Table>
                  {childLocationsTotal > 0 && (
                    <Table.Pagination
                      count={childLocationsTotal}
                      pageSize={OMNI_PAGE_SIZE}
                      pageIndex={Math.floor(omniPageOffset / OMNI_PAGE_SIZE)}
                      pageCount={Math.ceil(childLocationsTotal / OMNI_PAGE_SIZE)}
                      canPreviousPage={canPrevOmniPage}
                      canNextPage={canNextOmniPage}
                      previousPage={() =>
                        setOmniPageOffset((p) =>
                          Math.max(0, p - OMNI_PAGE_SIZE)
                        )
                      }
                      nextPage={() =>
                        setOmniPageOffset((p) =>
                          Math.min(
                            childLocationsTotal - OMNI_PAGE_SIZE,
                            p + OMNI_PAGE_SIZE
                          )
                        )
                      }
                    />
                  )}
                </div>
                <Text size="small" className="text-ui-fg-subtle mt-2">
                  Selected: {selectedChildIds.length} locations
                </Text>
              </div>

              <Button
                variant="primary"
                className="w-full"
                onClick={handleCreateHierarchy}
                disabled={!selectedParentId || selectedChildIds.length === 0}
              >
                Create Mapping
              </Button>
            </div>
          </FocusModal.Body>
        </FocusModal.Content>
      </FocusModal>
    </Container>
  );
};

export const config: RouteConfig = {
  label: "Location Hierarchy",
  icon: ListTree,
};

export default LocationHierarchyPage;
