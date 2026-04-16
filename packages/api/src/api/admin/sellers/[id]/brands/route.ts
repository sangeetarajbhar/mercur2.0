import type {
    AuthenticatedMedusaRequest,
    MedusaResponse,
  } from '@medusajs/framework/http'
  import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

  import SellerBrandLink from '../../../../../links/seller-brand'
  import { updateSellerBrandAssociationsWorkflow } from '../../../../../workflows/seller/workflows'

  const getBrandAssociations = async (scope: any, sellerId: string, limit?: number, offset?: number, searchQuery?: string) => {
    const query = scope.resolve(ContainerRegistrationKeys.QUERY)

    // For search, we need to fetch all brands first, then filter, then paginate
    // This ensures we can search across all brands, not just the current page
    const shouldSearch = searchQuery && searchQuery.trim().length > 0
    const searchTerm = shouldSearch ? searchQuery.trim().toLowerCase() : null

    // If searching, fetch all brands first to filter properly
    const fetchLimit = shouldSearch ? 10000 : (limit ? Number(limit) : 20)
    const fetchOffset = shouldSearch ? 0 : (offset ? Number(offset) : 0)

    const { data: brandLinks, metadata: { count } = {} } = await query.graph({
      entity: SellerBrandLink.entryPoint,
      fields: ['*', 'brand.*'],
      filters: {
        seller_id: sellerId,
      },
      pagination: {
        skip: fetchOffset,
        take: fetchLimit,
      },
    })

    let brandAssociations = brandLinks.map((link: any) => ({
      brand_id: link.brand?.id,
      name: link.brand?.name,
      handle: link.brand?.handle,
    }))

    // Apply search filter if provided
    if (searchTerm) {
      brandAssociations = brandAssociations.filter((ba: any) => {
        const nameMatch = ba.name?.toLowerCase().includes(searchTerm)
        const handleMatch = ba.handle?.toLowerCase().includes(searchTerm)
        return nameMatch || handleMatch
      })
    }

    // If we searched, we need to paginate the filtered results
    let paginatedBrands = brandAssociations
    let totalCount = brandAssociations.length
    const finalOffset = offset ? Number(offset) : 0
    const finalLimit = limit ? Number(limit) : 20

    if (shouldSearch && brandAssociations.length > 0) {
      // Apply pagination to filtered results
      paginatedBrands = brandAssociations.slice(finalOffset, finalOffset + finalLimit)
      totalCount = brandAssociations.length
    } else if (!shouldSearch) {
      // Use metadata count when not searching
      totalCount = count || brandAssociations.length
    }

    return {
      brand_associations: paginatedBrands,
      count: totalCount,
      limit: finalLimit,
      offset: finalOffset,
    }
  }

  export const GET = async (
    req: AuthenticatedMedusaRequest,
    res: MedusaResponse,
  ) => {
    const limit = req.query?.limit ? Number(req.query.limit) : 20
    const offset = req.query?.offset ? Number(req.query.offset) : 0
    const q = req.query?.q as string

    const result = await getBrandAssociations(req.scope, req.params.id, limit, offset, q)

    res.json(result)
  }

  export const POST = async (
    req: AuthenticatedMedusaRequest<{ brand_ids: string[] }>,
    res: MedusaResponse,
  ) => {
    const sellerId = req.params.id
    const newBrandIds = req.validatedBody.brand_ids ?? []

    // Get ALL current brand associations (with large limit) to calculate what needs to be added/removed
    // This ensures we get all brands, not just the first 20
    const currentBrands = await getBrandAssociations(req.scope, sellerId, 10000, 0)
    const currentBrandIds = (currentBrands.brand_associations || []).map((ba: any) => ba.brand_id).filter(Boolean)

    // Calculate which brands to add and which to remove
    const brandsToAdd = newBrandIds.filter((id: string) => !currentBrandIds.includes(id))
    const brandsToRemove = currentBrandIds.filter((id: string) => !newBrandIds.includes(id))

    await updateSellerBrandAssociationsWorkflow(req.scope).run({
      input: {
        sellerId,
        brand_associations: {
          update: brandsToAdd.map((brand_id: string) => ({ brand_id })),
          delete: brandsToRemove,
        },
      },
    })

    const result = await getBrandAssociations(req.scope, sellerId)

    res.json(result)
  }
