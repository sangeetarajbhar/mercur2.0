export const vendorAttributeQueryConfig = {
  list: {
    defaults: [
      "id",
      "name",
      "description",
      "handle",
      "is_filterable",
      "is_required",
      "ui_component",
      "metadata",
      "*possible_values",
    ],
    isList: true,
  },
  retrieve: {
    defaults: [
      "id",
      "name",
      "description",
      "handle",
      "is_filterable",
      "is_required",
      "ui_component",
      "metadata",
      "*possible_values",
    ],
    isList: false,
  },
}
