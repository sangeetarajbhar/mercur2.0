import React from "react";
import { Text, Badge } from "@medusajs/ui";

type StockLocation = {
  id: string;
  name: string;
  seller?: {
    id: string;
    name: string;
  };
};

type LocationHierarchyNode = {
  id: string;
  parent_location_id: string | null;
  child_location_id: string;
  children?: LocationHierarchyNode[];
};

type HierarchyTreeProps = {
  node: LocationHierarchyNode;
  locations: StockLocation[];
  depth?: number;
};

const HierarchyTree: React.FC<HierarchyTreeProps> = ({
  node,
  locations,
  depth = 0,
}) => {
  const childLocation = locations.find((loc) => loc.id === node.child_location_id);
  const sellerName = childLocation?.seller?.name || node.child_location_id;

  return (
    <div className="hierarchy-tree-node">
      <div
        className="flex items-center py-2"
        style={{ marginLeft: `${depth * 20}px` }}
      >
        <div className="flex items-center">
          {depth > 0 && (
            <div className="tree-line mr-2">
              {Array(depth)
                .fill(0)
                .map((_, i) => (
                  <span key={i} className="text-gray-400">
                    └─
                  </span>
                ))}
            </div>
          )}
          <Badge>{sellerName}</Badge>
        </div>
        {node.children && node.children.length > 0 && (
          <Text size="small" className="ml-2 text-gray-500">
            ({node.children.length} children)
          </Text>
        )}
      </div>
      {node.children && node.children.length > 0 && (
        <div className="children-container">
          {node.children.map((child) => (
            <HierarchyTree
              key={child.id}
              node={child}
              locations={locations}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default HierarchyTree;
