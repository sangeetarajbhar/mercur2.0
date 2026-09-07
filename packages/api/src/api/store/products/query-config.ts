export const defaultStoreProductFields = [
    "id",
    "title",
    "subtitle",
    "description",
    "handle",
    "is_giftcard",
    "discountable",
    "thumbnail",
    "collection_id",
    "type_id",
    "weight",
    "length",
    "height",
    "width",
    "hs_code",
    "origin_country",
    "mid_code",
    "material",
    "created_at",
    "updated_at",
    "*type",
    "*collection",
    "*options",
    "*options.values",
    "*tags",
    "*images",
    "*variants",
    "*variants.options",
    "*categories",
    "*categories.attributes",
    "*categories.attributes.possible_values",
    "*attribute_values",
    "*attribute_values.attribute",
    "*attribute_values.attribute.possible_values",
  ]
  
  export const retrieveProductQueryConfig = {
    defaults: defaultStoreProductFields,
    isList: false,
  }
  
  export const listProductQueryConfig = {
    ...retrieveProductQueryConfig,
    defaultLimit: 50,
    isList: true,
  }
  