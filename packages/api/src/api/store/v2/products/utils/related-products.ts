import complementaryCategoryMappings from '../../../../../config/complementary-categories.json'

interface ComplementaryMapping {
  gender: string
  category_type: string
  complementing_categories: string[]
}

/**
 * Extract gender from product - STRICT MODE
 * 
 * Priority Order (NO inference allowed):
 * 1. Category attributes (highest priority)
 * 2. Attribute values
 * 
 * DOES NOT infer from category names or titles
 */
export function extractGenderFromProduct(product: any): string | null {
  // Priority 1: Gender from category attributes (HIGHEST PRIORITY)
  if (product.categories && Array.isArray(product.categories)) {
    for (const category of product.categories) {
      if (category.attributes && Array.isArray(category.attributes)) {
        const genderAttr = category.attributes.find((attr: any) => 
          attr.name?.toLowerCase() === 'gender' && attr.value
        );
        if (genderAttr?.value) {
          return normalizeGender(genderAttr.value);
        }
      }
    }
  }
  
  // Priority 2: Gender from attribute_values
  if (product.attribute_values && Array.isArray(product.attribute_values)) {
    // First try: Find attribute with name='gender'
    const genderAttr = product.attribute_values.find((attr: any) => 
      (attr.attribute?.name?.toLowerCase() === 'gender' || 
       attr.name?.toLowerCase() === 'gender') &&
      attr.value
    );
    if (genderAttr?.value) {
      return normalizeGender(genderAttr.value);
    }
    
    // Fallback: If name is undefined, look for common gender values
    const validGenders = ['men', 'women', 'boys', 'girls', 'unisex', 'male', 'female'];
    const genderByValue = product.attribute_values.find((attr: any) => 
      attr.value && 
      validGenders.includes(attr.value.toLowerCase())
    );
    if (genderByValue?.value) {
      return normalizeGender(genderByValue.value);
    }
  }
  
  // Priority 3: Gender from Algolia filters (for Algolia products)
  if (product.filters?.gender && Array.isArray(product.filters.gender) && product.filters.gender.length > 0) {
    return normalizeGender(product.filters.gender[0]);
  }
  
  // Priority 4: Gender from metadata (fallback)
  if (product.metadata?.gender) {
    return normalizeGender(product.metadata.gender);
  }
  
  return null;
}

/**
 * Normalize gender value
 * - Capitalizes first letter
 * - Maps Male/Female to Men/Women
 */
function normalizeGender(gender: string): string {
  const normalized = gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase();
  
  // Map common variations
  if (normalized === 'Male') return 'Men';
  if (normalized === 'Female') return 'Women';
  
  return normalized;
}

/**
 * Extract style/look from product (Casual, Formal, Ethnic, etc.)
 * For Algolia products: uses filters.style or filters.fashion_type array
 * For database products: tries multiple sources and infers from category
 */
export function extractStyleFromProduct(product: any): string | null {
  // For Algolia products - style might be in filters.style or filters.fashion_type array
  if (product.filters?.style && Array.isArray(product.filters.style) && product.filters.style.length > 0) {
    return normalizeStyle(product.filters.style[0]);
  }
  
  // Also check filters.fashion_type (common field in product data)
  if (product.filters?.fashion_type && Array.isArray(product.filters.fashion_type) && product.filters.fashion_type.length > 0) {
    return normalizeStyle(product.filters.fashion_type[0]);
  }
  
  // Try metadata first
  if (product.metadata?.style) {
    return normalizeStyle(product.metadata.style);
  }
  
  // Try attribute_values
  if (product.attribute_values) {
    const styleAttr = product.attribute_values.find((attr: any) => 
      attr.attribute?.name?.toLowerCase() === 'style' || 
      attr.attribute?.name?.toLowerCase() === 'look' ||
      attr.attribute?.name?.toLowerCase() === 'fashion type' ||
      attr.name?.toLowerCase() === 'style' ||
      attr.name?.toLowerCase() === 'look' ||
      attr.name?.toLowerCase() === 'fashion type'
    );
    if (styleAttr?.value) {
      return normalizeStyle(styleAttr.value);
    }
  }
  
  // Infer from category name if possible
  const categoryName = product.categories?.[0]?.name?.toLowerCase() || 
                       product.filters?.category?.[0]?.toLowerCase() || '';
  
  if (categoryName) {
    if (categoryName.includes('formal') || categoryName.includes('office')) {
      return 'Formal';
    } else if (categoryName.includes('casual')) {
      return 'Casual';
    } else if (categoryName.includes('ethnic') || categoryName.includes('kurta') || 
               categoryName.includes('saree') || categoryName.includes('lehenga')) {
      return 'Ethnic';
    } else if (categoryName.includes('active') || categoryName.includes('sport')) {
      return 'Activewear';
    } else if (categoryName.includes('sleep') || categoryName.includes('night')) {
      return 'Sleepwear';
    }
  }
  
  // Default to casual if not determined
  return 'Casual';
}

/**
 * Normalize style value
 */
function normalizeStyle(style: string): string {
  return style.charAt(0).toUpperCase() + style.slice(1).toLowerCase();
}

/**
 * Get main category name from product
 * For Algolia products: uses filters.category array or categories array
 * For database products: uses categories array
 */
export function getMainCategoryName(product: any): string | null {
  // For Algolia products - try filters.category first
  if (product.filters?.category && Array.isArray(product.filters.category) && product.filters.category.length > 0) {
    return product.filters.category[0];
  }
  
  // Try categories array (works for both Algolia and database)
  if (product.categories && product.categories.length > 0) {
    return product.categories[0].name || product.categories[0];
  }
  
  return null;
}

/**
 * Normalize category name for matching
 * - Removes trailing numbers (Dresses1 -> Dresses)
 * - Removes special characters
 * - Trims whitespace
 */
function normalizeCategoryName(name: string): string {
  return name
    .replace(/\d+$/, '') // Remove trailing numbers
    .trim()
    .toLowerCase();
}

/**
 * Check if two category names match (with normalization and fuzzy matching)
 */
function categoriesMatch(cat1: string, cat2: string): boolean {
  const normalized1 = normalizeCategoryName(cat1);
  const normalized2 = normalizeCategoryName(cat2);
  
  // Exact match
  if (normalized1 === normalized2) {
    return true;
  }
  
  // Plural/singular match (Dress/Dresses, Jean/Jeans)
  if (normalized1 === normalized2 + 's' || normalized1 + 's' === normalized2) {
    return true;
  }
  
  // Contains match
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    return true;
  }
  
  return false;
}

/**
 * Get ALL category names from product (not just the first one)
 * For Algolia products: uses filters.category array or categories array
 * For database products: uses categories array
 */
function getAllCategoryNames(product: any): string[] {
  const categoryNames: string[] = [];
  
  // For Algolia products - try filters.category first
  if (product.filters?.category && Array.isArray(product.filters.category)) {
    categoryNames.push(...product.filters.category);
  }
  
  // Try categories array (works for both Algolia and database)
  if (product.categories && Array.isArray(product.categories)) {
    for (const category of product.categories) {
      const name = category.name || category;
      if (name && typeof name === 'string') {
        categoryNames.push(name);
      }
    }
  }
  
  // Remove duplicates
  return [...new Set(categoryNames)];
}

/**
 * Get complementary categories for a product based on gender and ALL categories
 * Searches through ALL categories in the product to find a match
 */
export function getComplementaryCategories(product: any): string[] {
  try {
    const gender = extractGenderFromProduct(product);
    const allCategories = getAllCategoryNames(product);

    if (!gender || allCategories.length === 0) {
      return [];
    }

    // Try to find a mapping for ANY of the product's categories
    for (const categoryName of allCategories) {
      const mapping = complementaryCategoryMappings.complementary_category_mappings.find(
        (m: ComplementaryMapping) => 
          m.gender === gender && 
          categoriesMatch(m.category_type, categoryName)
      );

      if (mapping) {
        return mapping.complementing_categories;
      }
    }

    return [];

  } catch (error) {
    console.error('Error getting complementary categories:', error);
    return [];
  }
}
