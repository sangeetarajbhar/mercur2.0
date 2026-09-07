import { Text, Badge, clx } from "@medusajs/ui";
import { AdminProductCategory } from "@medusajs/types";
import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  TrianglesMini,
  XMarkMini,
  ArrowUturnLeft,
  TriangleRightMiniHover,
} from "@medusajs/icons";

type MultiSelectCategoryProps = {
  categories: AdminProductCategory[];
  value: string[];
  onChange: (value: string[]) => void;
};

const MultiSelectCategory: React.FC<MultiSelectCategoryProps> = ({
  categories,
  value,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [currentParentId, setCurrentParentId] = useState<string | null>(null);
  const [pathHistory, setPathHistory] = useState<(string | null)[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearch("");
        setCurrentParentId(null);
        setPathHistory([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      searchInputRef.current?.focus();
    }
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
    if (!isOpen) {
      setSearch("");
      setCurrentParentId(null);
      setPathHistory([]);
    }
  };

  const handleClearSearch = () => {
    setSearch("");
    searchInputRef.current?.focus();
  };

  const hasChildren = (categoryId: string) => {
    return categories.some((cat) => cat.parent_category_id === categoryId);
  };

  const handleDrillDown = (
    category: AdminProductCategory,
    event: React.MouseEvent
  ) => {
    event.stopPropagation();
    setPathHistory([...pathHistory, currentParentId]);
    setCurrentParentId(category.id);
  };

  const handleGoBack = () => {
    const newPathHistory = [...pathHistory];
    const previousParentId = newPathHistory.pop();
    setPathHistory(newPathHistory);
    setCurrentParentId(previousParentId || null);
  };

  const handleItemClick = (categoryId: string) => {
    const isSelected = value.includes(categoryId);
    if (isSelected) {
      onChange(value.filter((id) => id !== categoryId));
    } else {
      onChange([...value, categoryId]);
    }
  };

  const currentCategories = useMemo(() => {
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      return categories.filter((cat) =>
        cat.name.toLowerCase().includes(searchLower)
      );
    }
    if (currentParentId !== null) {
      return categories.filter(
        (cat) => cat.parent_category_id === currentParentId
      );
    }
    return categories.filter((cat) => !cat.parent_category_id);
  }, [categories, search, currentParentId]);

  const getBackButtonText = (): string => {
    const parentCategory = categories.find(
      (cat) => cat.id === currentParentId
    );
    return parentCategory?.name || "";
  };

  return (
    <div className="relative">
      <div
        ref={triggerRef}
        className="relative flex h-10 w-full cursor-pointer items-center justify-between overflow-hidden rounded-md border border-ui-border-base bg-ui-bg-field text-ui-fg-base shadow-sm transition-colors duration-150 ease-in-out hover:bg-ui-bg-field-hover focus-within:border-ui-border-interactive focus-within:ring-1 focus-within:ring-ui-ring-interactive"
        onClick={handleToggle}
      >
        <div className="flex items-center gap-2 px-3 py-2">
          {value.length > 0 ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange([]);
              }}
            >
              <div className="flex flex-wrap items-center gap-1 py-2">
                {value.map((id) => {
                  const category = categories.find((cat) => cat.id === id);
                  return (
                    <Badge
                      key={id}
                      size="small"
                      className="w-fit flex items-center gap-1"
                    >
                      {category?.name || "Unknown"}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onChange(value.filter((val) => val !== id));
                        }}
                      >
                        <XMarkMini className="w-3 h-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            </button>
          ) : (
            <Text className="text-ui-fg-subtle">Select categories</Text>
          )}
        </div>
        <span className="flex h-full w-10 items-center justify-center border-l border-ui-border-base">
          <TrianglesMini />
        </span>
      </div>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-10 mt-1 w-full max-h-60 overflow-hidden rounded-md border border-ui-border-base bg-ui-bg-base shadow-lg"
        >
          <div className="border-b p-1">
            <div className="grid grid-cols-[1fr_20px] gap-x-2 rounded-md px-2 py-1 items-center">
              <input
                ref={searchInputRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="txt-compact-small placeholder:text-ui-fg-muted bg-transparent outline-none"
                placeholder="Search categories..."
              />
              <div className="flex h-5 w-5 items-center justify-center">
                <button
                  type="button"
                  disabled={!search}
                  onClick={handleClearSearch}
                  className={clx(
                    "transition-fg text-ui-fg-muted focus-visible:bg-ui-bg-base-pressed rounded-md outline-none",
                    {
                      invisible: !search,
                    }
                  )}
                >
                  <XMarkMini />
                </button>
              </div>
            </div>
          </div>

          {currentParentId !== null && !search.trim() && (
            <div
              className="flex cursor-pointer items-center gap-3 px-3 py-2 text-ui-fg-subtle hover:bg-ui-bg-base-hover border-b border-ui-border-base"
              onClick={handleGoBack}
            >
              <ArrowUturnLeft />
              <Text>{getBackButtonText()}</Text>
            </div>
          )}

          <div className="h-full max-h-[200px] min-h-[0] overflow-auto p-1 outline-none">
            {currentCategories.length === 0 ? (
              <div className="txt-compact-small flex items-center justify-center p-3">
                <span className="text-ui-fg-subtle">
                  No categories found.
                </span>
              </div>
            ) : (
              currentCategories.map((category) => {
                const isSelected = value.includes(category.id);
                const hasChildrenNode = hasChildren(category.id);
                return (
                  <div
                    key={category.id}
                    role="option"
                    aria-selected={isSelected}
                    className={clx(
                      "bg-ui-bg-base hover:bg-ui-bg-base-hover text-ui-fg-base txt-compact-small relative flex cursor-pointer select-none items-center justify-between gap-x-2 rounded-md px-2 py-1.5 outline-none transition-colors",
                      {
                        "pl-6": isSelected,
                      }
                    )}
                    onClick={() => handleItemClick(category.id)}
                  >
                    <div className="flex items-center flex-1">
                      {isSelected && (
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 w-1 h-1 bg-ui-fg-base rounded-full" />
                      )}
                      <Text>{category.name}</Text>
                    </div>
                    {hasChildrenNode && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDrillDown(category, e);
                        }}
                        className="p-2 rounded-md hover:bg-ui-bg-base-pressed"
                      >
                        <TriangleRightMiniHover className="mr-1" />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiSelectCategory;
