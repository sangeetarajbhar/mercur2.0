/**
 * Product Gender Extractor Utility
 * Single Responsibility: Extracts gender information from product data
 */

export const getProductGender = (product: any): string | null => {
  // 1) From metadata.gender
  if (product?.metadata?.gender) {
    return product.metadata.gender
  }

  // 2) From attribute_values
  if (product?.attribute_values) {
    const genderAttr = product.attribute_values.find(
      (attr: any) =>
        attr.attribute?.name?.toLowerCase() === "gender" ||
        attr.name?.toLowerCase() === "gender"
    )
    if (genderAttr?.value) {
      return genderAttr.value
    }
  }

  // 3) From category attributes
  if (product?.categories) {
    for (const category of product.categories) {
      if (category?.attributes) {
        const genderAttr = category.attributes.find(
          (attr: any) => attr.name?.toLowerCase() === "gender" && attr.value
        )
        if (genderAttr?.value) {
          return genderAttr.value
        }
      }
    }
  }

  return null
}
