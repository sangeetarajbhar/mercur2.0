import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"
import { Modules, ProductStatus } from "@medusajs/framework/utils"
import { processProductImagesStream, logMemoryUsage, forceGarbageCollection } from "../../../shared/utils/streaming-image-processor"
// import { updateProductsWorkflow } from "@medusajs/medusa/core-flows"

export const processProductImagesStepId = "process-product-images"

/**
 * This step processes product images by downloading, resizing, and uploading them to S3
 * according to the required dimensions and folder structure.
 */
export const processProductImagesStep = createStep(
  processProductImagesStepId,
  async (
    { created, productsWithBrandId }: { created: unknown[]; productsWithBrandId: unknown[] },
    { container }
  ) => {
    try {
      const productService = container.resolve(Modules.PRODUCT)
      
      logMemoryUsage('Image processing start')
      
      // Collect failed images for UI display
      const failedImages: Array<{
        productId: string
        productTitle: string
        productHandle: string
        imageUrl: string
        error: string
      }> = []
      
      // Use smaller batch size for memory efficiency
      const BATCH_SIZE = 10
      const totalBatches = Math.ceil(created.length / BATCH_SIZE)
      
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const batchStart = batchIndex * BATCH_SIZE
        const batchEnd = Math.min(batchStart + BATCH_SIZE, created.length)
        
        logMemoryUsage(`Before image batch ${batchIndex + 1}`)

        // Process products in current batch sequentially to manage memory
        for (let i = batchStart; i < batchEnd; i++) {
          const createdProduct = created[i] as Record<string, unknown>
          const originalProduct = productsWithBrandId[i] as Record<string, unknown>

          try {
            // Get product name for image filenames
            const productName = (createdProduct.title as string) || 'product'
            
            // Get style ID or use product ID if not available
            const productMetadata = originalProduct['Product Metadata'] as Record<string, unknown> | undefined
            const styleId = (productMetadata?.style_id as string) || (createdProduct.id as string)
            
            // Extract image URLs from metadata (stored during product creation)
            const imageUrls: string[] = []
            
            // Check metadata for pending images first
            const createdProductMetadata = createdProduct.metadata as Record<string, unknown> | undefined
            if (createdProductMetadata?._pending_images && Array.isArray(createdProductMetadata._pending_images)) {
              createdProductMetadata._pending_images.forEach((url: unknown) => {
                if (typeof url === 'string' && url.trim()) {
                  imageUrls.push(url.trim())
                }
              })
            }

            // console.error('[DEBUG] createdProductMetadata:', JSON.stringify(createdProductMetadata, null, 2))

            // Fallback: Check original product for image URLs if not in metadata
            // if (imageUrls.length === 0) {
            //   // Check Product Image X Url fields
            //   const imageFields = [
            //     'Product Image 1 Url',
            //     'Product Image 2 Url',
            //     'Product Image 3 Url',
            //     'Product Image 4 Url',
            //     'Product Image 5 Url',
            //     'Product Image 6 Url'
            //   ]
              
            //   imageFields.forEach(field => {
            //     const url = originalProduct[field]
            //     if (url && typeof url === 'string' && url.trim()) {
            //       imageUrls.push(url.trim())
            //     }
            //   })
              
            //   // Also check Original Image URLs object
            //   const originalImageUrls = originalProduct['Original Image URLs'] as Record<string, unknown> | undefined
            //   if (originalImageUrls) {
            //     Object.values(originalImageUrls).forEach(url => {
            //       if (url && typeof url === 'string' && url.trim()) {
            //         imageUrls.push(url.trim())
            //       }
            //     })
            //   }
            // }

            if (imageUrls.length === 0) {
              // No images to process, continue to next product
              continue
            }

            // console.error('[DEBUG] imageUrls:', JSON.stringify(imageUrls, null, 2))

            // Process images using streaming processor
            const result = await processProductImagesStream(
              styleId,
              productName,
              imageUrls
            )

            // console.error('[DEBUG] result:', JSON.stringify(result, null, 2))

            // Track if any image failed
            let hasImageFailure = false
            const productImages: Array<{url: string}> = []
            let thumbnailUrl = ''

            // console.error('[DEBUG] productImages:', JSON.stringify(productImages, null, 2))

            // Check if at least some images were successfully processed
            // Note: result.success is true only if errors.length === 0, so we check processedImages.length instead
            if (result.processedImages.length > 0) {
              // At least some images succeeded - add them to product
              result.processedImages.forEach(img => {
                console.error('[DEBUG] img:', JSON.stringify(img, null, 2))
                if (img.size === 'original') {
                  console.error('[DEBUG] img.url:', JSON.stringify(img.url, null, 2))
                  productImages.push({ url: img.url })
                  if (!thumbnailUrl) {
                    console.error('[DEBUG] thumbnailUrl:', JSON.stringify(thumbnailUrl, null, 2))
                    thumbnailUrl = img.url
                  }
                }
              })

              // Check for partial failures - some images succeeded but some failed
              if (result.errors.length > 0) {
                console.error('[DEBUG] result.errors:', JSON.stringify(result.errors, null, 2))
                hasImageFailure = true
                console.warn(`[STREAM-IMG] Some images failed for product ${createdProduct.id}:`, result.errors)
                
                // Collect failed images for UI display
                result.errors.forEach(error => {
                  failedImages.push({
                    productId: createdProduct.id as string,
                    productTitle: productName,
                    productHandle: (createdProduct.handle as string) || 'unknown',
                    imageUrl: error,
                    error: 'Failed to process after 4 attempts (partial failure)'
                  })
                })
              }
            } else {
              // ALL images failed - no images were successfully processed
              hasImageFailure = true
              
              // Determine if we have error messages or if images just weren't processed
              if (result.errors.length > 0) {
                console.warn(`[STREAM-IMG] All images failed processing for product ${createdProduct.id} after 4 attempts:`, result.errors)
                
                // Collect failed images for UI display
                result.errors.forEach(error => {
                  failedImages.push({
                    productId: createdProduct.id as string,
                    productTitle: productName,
                    productHandle: (createdProduct.handle as string) || 'unknown',
                    imageUrl: error,
                    error: 'Failed to process after 4 attempts'
                  })
                })
              } else if (imageUrls.length > 0) {
                // No errors reported but no images processed - all must have failed silently
                console.warn(`[STREAM-IMG] All ${imageUrls.length} images failed processing for product ${createdProduct.id} (no error details)`)
                
                // Collect all image URLs as failed
                imageUrls.forEach(imageUrl => {
                  failedImages.push({
                    productId: createdProduct.id as string,
                    productTitle: productName,
                    productHandle: (createdProduct.handle as string) || 'unknown',
                    imageUrl: imageUrl,
                    error: 'No images were successfully processed'
                  })
                })
              }
              
              // Ensure productImages is empty when all images fail
              productImages.length = 0
              thumbnailUrl = ''
              console.warn(`[STREAM-IMG] Clearing all images and thumbnail for product ${createdProduct.id} due to complete failure (processed: ${result.processedImages.length}, errors: ${result.errors.length}, total: ${imageUrls.length})`)
            }

            // Update product with only successfully processed images (empty array if none succeeded)
            // Remove _pending_images from metadata
            const updatedMetadata = { ...(createdProductMetadata || {}) }
            delete updatedMetadata._pending_images

            // Get current product status to check if it was previously 'proposed' due to image failures
            const currentProduct = await productService.retrieveProduct(createdProduct.id as string)
            const wasProposedDueToImages = currentProduct.status === 'proposed'

            const updateData: {
              images: Array<{url: string}>
              thumbnail?: string | null,
              status?: ProductStatus
              metadata?: Record<string, unknown>
            } = {
              images: productImages, // Empty array if no images succeeded
              metadata: updatedMetadata
            }

            // Set thumbnail only if we have successfully processed images
            // If all images failed, explicitly clear the thumbnail
            if (thumbnailUrl && productImages.length > 0) {
              updateData.thumbnail = thumbnailUrl
            } else if (hasImageFailure && productImages.length === 0) {
              // Explicitly clear thumbnail when all images failed
              updateData.thumbnail = null
            }
            if(originalProduct.status === 'draft') {
              updateData.status = 'draft' as ProductStatus
              console.warn(`[STREAM-IMG] Keeping product ${createdProduct.id} in 'draft' because CSV says it must remain draft`)
            } else {
              // Handle status based on image processing results
              if (hasImageFailure) {
                // If ANY image failed, mark product as 'proposed'
                updateData.status = 'proposed' as ProductStatus
                console.warn(`[STREAM-IMG] Marking product ${createdProduct.id} as 'proposed' due to image processing failure(s)`)
              } else if (wasProposedDueToImages && productImages.length > 0 && result.errors.length === 0) {
                // All images succeeded and product was previously 'proposed' due to image failures
                // Reset status to 'published' so it can be published (request will auto-accept if approval not required)
                updateData.status = 'published' as ProductStatus
                console.warn(`[STREAM-IMG] Resetting product ${createdProduct.id} status from 'proposed' to 'published' - all images now processed successfully`)
              }
            }
            // // Handle status based on image processing results
            // if (hasImageFailure) {
            //   // If ANY image failed, mark product as 'proposed'
            //   updateData.status = 'proposed' as ProductStatus
            //   console.warn(`[STREAM-IMG] Marking product ${createdProduct.id} as 'proposed' due to image processing failure(s)`)
            // } else if (wasProposedDueToImages && productImages.length > 0 && result.errors.length === 0) {
            //   // All images succeeded and product was previously 'proposed' due to image failures
            //   // Reset status to 'draft' so it can be published (request will auto-accept if approval not required)
            //   updateData.status = 'published' as ProductStatus
            //   console.warn(`[STREAM-IMG] Resetting product ${createdProduct.id} status from 'proposed' to 'published' - all images now processed successfully`)
            // }

            // Update the product - always update to ensure images are cleared if all failed
            await productService.updateProducts(createdProduct.id as string, updateData)
            // const updatedProduct = await productService.updateProducts(
            //   { id: createdProduct.id as string }, // selector
            //   updateData
            // )

            // const productId = createdProduct.id as string

            // const productsToUpdate = transform(
            //   { productId, updateData },
            //   ({ productId, updateData }) => [
            //     {
            //       id: productId,
            //       images: updateData.images,
            //       metadata: updateData.metadata,
            //       status: updateData.status,
            //     },
            //   ]
            // )

            // const workflow = updateProductsWorkflow(container)

            // const { result: updatedProducts } = await workflow.run({
            //   input: {
            //     products: [
            //       {
            //         id: createdProduct.id as string,
            //         // spread your existing updateData
            //         ...updateData,
            //       },
            //     ],
            //   },
            // })
            
            // const updatedProduct = updatedProducts?.[0]
            
            
            // console.error('[DEBUG] updatedProduct:', JSON.stringify(updatedProduct, null, 2))
            
            // Log what was updated for debugging
            if (hasImageFailure && productImages.length === 0) {
              console.warn(`[STREAM-IMG] Product ${createdProduct.id} updated with: images=[], status=proposed`)
            }

            // Memory check after each product
            const memoryUsage = process.memoryUsage()
            const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024
            
            if (heapUsedMB > 1200) { // 1.2GB threshold for images
              console.warn(`[STREAM-IMG] High memory usage: ${Math.round(heapUsedMB)}MB, forcing GC`)
              forceGarbageCollection()
              
              // Small delay to allow GC to complete
              await new Promise(resolve => setTimeout(resolve, 100))
            }

          } catch (error: any) {
            console.error(`[STREAM-IMG] Error processing images for product ${createdProduct.id}:`, {
              error: JSON.stringify(error, null, 2),
              message: error?.message,
              code: error?.code,
              name: error?.name
            })
            
            // Collect error for UI display
            const productName = (createdProduct.title as string) || 'product'
            // const originalProduct = productsWithBrandId[i] as Record<string, unknown>
            const imageUrls: string[] = []
            
            // Extract image URLs for error reporting from metadata or original product
            const createdProductMetadata = createdProduct.metadata as Record<string, unknown> | undefined
            if (createdProductMetadata?._pending_images && Array.isArray(createdProductMetadata._pending_images)) {
              createdProductMetadata._pending_images.forEach((url: unknown) => {
                if (typeof url === 'string' && url.trim()) {
                  imageUrls.push(url.trim())
                }
              })
            }
            
            // Fallback to original product fields
            // if (imageUrls.length === 0) {
            //   const imageFields = [
            //     'Product Image 1 Url',
            //     'Product Image 2 Url',
            //     'Product Image 3 Url',
            //     'Product Image 4 Url',
            //     'Product Image 5 Url',
            //     'Product Image 6 Url'
            //   ]
              
            //   imageFields.forEach(field => {
            //     const url = originalProduct[field]
            //     if (url && typeof url === 'string' && url.trim()) {
            //       imageUrls.push(url.trim())
            //     }
            //   })
            // }
            
            // Add all images as failed due to processing error
            imageUrls.forEach(imageUrl => {
              failedImages.push({
                productId: createdProduct.id as string,
                productTitle: productName,
                productHandle: (createdProduct.handle as string) || 'unknown',
                imageUrl: imageUrl,
                error: `Processing error: ${error?.message || 'Unknown error'}`
              })
            })
            
            // Mark product as 'proposed' due to processing error
            // Explicitly clear images and thumbnail
            try {
              const updatedMetadata = { ...(createdProductMetadata || {}) }
              delete updatedMetadata._pending_images

              // console.error('[DEBUG] updatedMetadata:', JSON.stringify(updatedMetadata, null, 2))
              
              await productService.updateProducts(createdProduct.id as string, {
                images: [], // No images stored due to error
                thumbnail: null,
                status: 'proposed' as ProductStatus,
                metadata: updatedMetadata
              })
              
              console.warn(`[STREAM-IMG] Marking product ${createdProduct.id} as 'proposed' due to image processing error`)
            } catch (updateError) {
              console.error(`[STREAM-IMG] Failed to update product ${createdProduct.id} status:`, updateError)
            }
            
            // Continue with next product - don't fail entire batch for one product's image errors
          }
        }

        // Force garbage collection between batches
        forceGarbageCollection()
        logMemoryUsage(`After image batch ${batchIndex + 1}`)

        // Delay between batches to allow system recovery
        if (batchIndex < totalBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }
      
      logMemoryUsage('Image processing end')
      
      // Log summary of failed images
      if (failedImages.length > 0) {
        console.warn(`[STREAM-IMG] Total failed images: ${failedImages.length}`)
      }
      
      return new StepResponse({
        created,
        failedImages
      })
    } catch (error) {
      console.error('[STREAM-IMG] Error in processProductImagesStep:', error)
      logMemoryUsage('Image processing error')
      
      // Return empty failed images array on critical error
      return new StepResponse({
        created,
        failedImages: []
      })
    }
  }
)

