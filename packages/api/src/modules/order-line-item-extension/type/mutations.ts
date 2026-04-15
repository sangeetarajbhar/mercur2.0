export type CreateOrderLineItemExtensionDTO = {
  order_line_item_id: string,
  returnable_flag: boolean,
  return_no_of_days: number,
  return_end_date: Date | null,
  item_total: number | null,
  item_discount_total: number | null,
}
