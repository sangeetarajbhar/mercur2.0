// import { WorkflowResponse, createWorkflow } from '@medusajs/framework/workflows-sdk'

// import { 
//   getCustomProductsForExportStep,
//   generateCustomProductCsvStep
// } from '../steps'

// interface ExportFilters {
//   seller_id?: string
//   brand_id?: string
//   category_id?: string
//   status?: string
//   created_at?: string
//   updated_at?: string
//   tag_id?: string
//   type_id?: string
//   sales_channel_id?: string
// }

// export const exportCustomProductsWorkflow = createWorkflow(
//   'export-custom-products',
//   function (filters: ExportFilters) {
//     // Get comprehensive product data including all related entities
//     const productData = getCustomProductsForExportStep(filters)

//     // Generate CSV file with all the data
//     const file = generateCustomProductCsvStep(productData)

//     // Return file data directly (file is stored in S3, not in file module)
//     return new WorkflowResponse(file)
//   }
// )
