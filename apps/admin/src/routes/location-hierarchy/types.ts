export type StockLocation = {
  id: string;
  name: string;
  seller?: {
    id: string;
    name: string;
  };
  extensions?: StockLocationExtension[];
};

export type StockLocationExtension = {
  id: string;
  location_type: string;
  address_type?: string;
  latitude?: number;
  longitude?: number;
  partner_id?: string;
  return_location_id?: string;
  status?: string;
  servisibility_status?: string;
  start_time?: string;
  end_time?: string;
  stock_location: { id: string };
};

export type LocationHierarchyNode = {
  id: string;
  parent_location_id: string | null;
  child_location_id: string;
  location_type?: string;
  seller?: {
    id: string;
    name: string;
  };
  children?: LocationHierarchyNode[];
};

export type ApiChildItem = {
  id: string;
  name: string;
  seller?: { id: string; name: string } | Array<{ id: string; name: string }>;
  stock_location_extension?: { location_type?: string };
  hierarchyId: string;
  created_at: string;
};

export type ApiParentRow = {
  id: string;
  name: string;
  location_type?: string;
  child: ApiChildItem[];
};

export const LOCATION_TYPE_MAP: Record<string, string> = {
  "1": "DS",
  "2": "Omni",
  Unknown: "Unknown Type",
};
