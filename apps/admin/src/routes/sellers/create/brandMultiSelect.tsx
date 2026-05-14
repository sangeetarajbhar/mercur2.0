import { ChevronLeft, ChevronRight } from "@medusajs/icons"
import { Button, Checkbox, Input, Text } from "@medusajs/ui"
import { useEffect, useMemo, useState } from "react"
import { useBrands } from "../../../hooks/api/brands"

interface BrandMultiSelectProps {
  selectedBrandIds: string[]
  onSelectionChange: (brandIds: string[]) => void
  preloadedBrands?: Array<{ id: string; name: string; handle?: string }>
}

const PAGE_SIZE = 25

export const BrandMultiSelect = ({
  selectedBrandIds,
  onSelectionChange,
  preloadedBrands = [],
}: BrandMultiSelectProps) => {
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [pageIndex, setPageIndex] = useState(0)
  const [brandsCache, setBrandsCache] = useState<Map<string, { id: string; name: string }>>(
    new Map()
  )

  const preloadedBrandIds = useMemo(
    () => preloadedBrands.map((b) => b.id).filter(Boolean).sort().join(","),
    [preloadedBrands]
  )
  const memoizedPreloadedBrands = useMemo(() => preloadedBrands, [preloadedBrandIds])

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPageIndex(0)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const offset = pageIndex * PAGE_SIZE
  const { data: brandsData, isLoading } = useBrands({ limit: PAGE_SIZE, offset, q: debouncedSearch })
  const { data: allBrandsData } = useBrands({
    limit: selectedBrandIds.length > 0 ? 10000 : 1000,
    offset: 0,
    q: debouncedSearch || undefined,
  })

  useEffect(() => {
    if (memoizedPreloadedBrands.length > 0) {
      setBrandsCache((prev) => {
        const next = new Map(prev)
        memoizedPreloadedBrands.forEach((brand) => {
          if (brand.id) next.set(brand.id, { id: brand.id, name: brand.name })
        })
        return next
      })
    }
  }, [memoizedPreloadedBrands])

  useEffect(() => {
    setBrandsCache((prev) => {
      const next = new Map(prev)
      memoizedPreloadedBrands.forEach((brand) => {
        if (brand.id) next.set(brand.id, { id: brand.id, name: brand.name })
      })
      brandsData?.brands?.forEach((brand) => next.set(brand.id, { id: brand.id, name: brand.name }))
      allBrandsData?.brands?.forEach((brand) => next.set(brand.id, { id: brand.id, name: brand.name }))
      return next
    })
  }, [brandsData, allBrandsData, memoizedPreloadedBrands])

  const brands = brandsData?.brands || []
  const totalCount = brandsData?.count ?? 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const handleBrandToggle = (brandId: string) => {
    const isSelected = selectedBrandIds.includes(brandId)
    onSelectionChange(
      isSelected ? selectedBrandIds.filter((id) => id !== brandId) : [...selectedBrandIds, brandId]
    )
  }

  const currentPageAllSelected = brands.length > 0 && brands.every((b) => selectedBrandIds.includes(b.id))
  const currentPageSomeSelected = brands.some((b) => selectedBrandIds.includes(b.id))

  return (
    <div className="flex flex-col gap-4">
      <Input
        size="small"
        placeholder="Search brands..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {brands.length > 0 && (
        <div className="flex items-center gap-2 border-b border-ui-border-base pb-2">
          <Checkbox
            checked={currentPageAllSelected}
            onCheckedChange={() => {
              const currentIds = brands.map((b) => b.id)
              if (currentPageAllSelected) {
                onSelectionChange(selectedBrandIds.filter((id) => !currentIds.includes(id)))
              } else {
                const next = [...selectedBrandIds]
                currentIds.forEach((id) => !next.includes(id) && next.push(id))
                onSelectionChange(next)
              }
            }}
            className={currentPageSomeSelected && !currentPageAllSelected ? "data-[state=checked]:bg-ui-bg-interactive" : ""}
          />
          <Text size="small" weight="plus">
            Select Current Page ({selectedBrandIds.length} selected)
          </Text>
        </div>
      )}

      <div className="border border-ui-border-base rounded-lg max-h-[400px] overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center">
            <Text size="small" className="text-ui-fg-subtle">Loading brands...</Text>
          </div>
        ) : brands.length === 0 ? (
          <div className="p-4 text-center">
            <Text size="small" className="text-ui-fg-subtle">
              {debouncedSearch ? "No brands found matching your search" : "No brands available"}
            </Text>
          </div>
        ) : (
          <div className="divide-y divide-ui-border-base">
            {brands.map((brand) => (
              <div
                key={brand.id}
                className="flex items-center gap-3 p-3 hover:bg-ui-bg-subtle-hover cursor-pointer"
                onClick={() => handleBrandToggle(brand.id)}
              >
                <Checkbox checked={selectedBrandIds.includes(brand.id)} onCheckedChange={() => handleBrandToggle(brand.id)} />
                <Text size="small" className="flex-1">{brand.name}</Text>
              </div>
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Text size="small" className="text-ui-fg-subtle">
            Page {pageIndex + 1} of {totalPages} ({totalCount} total)
          </Text>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="small"
              onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
              disabled={pageIndex === 0}
            >
              <ChevronLeft />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="small"
              onClick={() => setPageIndex((p) => Math.min(totalPages - 1, p + 1))}
              disabled={pageIndex >= totalPages - 1}
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      )}

      {selectedBrandIds.length > 0 && (
        <div className="border-t border-ui-border-base pt-4">
          <Text size="small" weight="plus" className="mb-2 block">
            Selected Brands ({selectedBrandIds.length}):
          </Text>
          <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto">
            {selectedBrandIds.map((brandId) => {
              const brand = brandsCache.get(brandId)
              return (
                <div key={brandId} className="inline-flex items-center gap-1 px-2 py-1 bg-ui-bg-subtle rounded text-xs">
                  <Text size="xsmall">{brand?.name || brandId}</Text>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleBrandToggle(brandId)
                    }}
                    className="text-ui-fg-subtle hover:text-ui-fg-base ml-1"
                  >
                    ×
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

