export type CreateStockLocationDocumentDTO = {
  stock_location_section_id: string,
  document_type: string,
  document_number: string,
  pdf_url: string,
}

export interface UpdateStockLocationDocumentDTO {
  id: string
  document_type?: string
  document_number?: string
  pdf_url?: string
}
